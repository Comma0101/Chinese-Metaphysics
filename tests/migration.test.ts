import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/202607100001_paid_pilot.sql",
  import.meta.url,
);
const repositoryUrl = new URL("../lib/server/applications.ts", import.meta.url);

test("migration contains only the approved deposit lifecycle states", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  for (const speculativeState of [
    "price_offered",
    "core_offered",
    "core_paid",
  ]) {
    assert.equal(sql.includes(speculativeState), false);
  }
  for (const approvedState of [
    "submitted",
    "qualified",
    "declined",
    "safety_refused",
    "checkout_created",
    "deposit_paid",
    "deposit_refunded",
    "withdrawn",
    "redacted",
  ]) {
    assert.equal(sql.includes(`'${approvedState}'`), true);
  }
});

test("migration makes consent rows immutable while preserving deletion", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(
    sql,
    /create function public\.reject_application_consent_update\(\)/i,
  );
  assert.match(
    sql,
    /before update on public\.application_consents[\s\S]*reject_application_consent_update/i,
  );
  assert.doesNotMatch(sql, /before delete on public\.application_consents/i);
  assert.match(
    sql,
    /application_id uuid primary key references public\.pilot_applications\(id\) on delete cascade/i,
  );
});

test("migration makes payment references append-only and state-bound", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /create function public\.enforce_payment_reference_integrity\(\)/i);
  assert.match(
    sql,
    /before update of stripe_checkout_session_id, stripe_payment_intent_id, status[\s\S]*enforce_payment_reference_integrity/i,
  );
  assert.match(
    sql,
    /new\.stripe_checkout_session_id is distinct from old\.stripe_checkout_session_id/i,
  );
  assert.match(
    sql,
    /new\.stripe_payment_intent_id is distinct from old\.stripe_payment_intent_id/i,
  );
});

test("migration validates event metadata and notification error codes", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /create function public\.valid_application_event_metadata\(/i);
  assert.match(
    sql,
    /check \(public\.valid_application_event_metadata\(metadata\)\)/i,
  );
  for (const key of [
    "cohort",
    "stripeEventType",
    "processor",
    "sourceStatus",
    "recipientRole",
  ]) {
    assert.equal(sql.includes(`'${key}'`), true);
  }
  assert.match(
    sql,
    /last_error_code text check \(\s*last_error_code is null or\s+last_error_code ~ '\^\[a-z0-9\]/i,
  );
  assert.equal(sql.includes("'stale_state'"), true);
});

test("notification outbox is typed, idempotent, reclaimable, and concurrency safe", async () => {
  const [sql, repository] = await Promise.all([
    readFile(migrationUrl, "utf8"),
    readFile(repositoryUrl, "utf8"),
  ]);

  for (const kind of [
    "founder_application_received",
    "founder_deposit_paid",
    "client_deposit_paid",
    "founder_payment_alert",
  ]) {
    assert.equal(sql.includes(`'${kind}'`), true);
  }
  assert.match(sql, /status text not null default 'pending' check \(status in \(\s*'pending', 'sending', 'sent', 'failed'/i);
  assert.match(sql, /attempt_count integer not null default 0 check \(attempt_count between 0 and 5\)/i);
  assert.match(sql, /provider_message_id text check/i);
  assert.match(sql, /next_attempt_at timestamptz/i);
  assert.match(sql, /locked_at timestamptz/i);
  assert.match(sql, /lease_token uuid/i);
  for (const column of [
    "payload_to",
    "payload_from",
    "payload_subject",
    "payload_text",
    "payload_hash",
    "source_state",
    "source_amount",
    "source_currency",
    "source_occurred_at",
    "source_cohort",
    "snapshot_country",
    "snapshot_region",
  ]) {
    assert.match(sql, new RegExp(`${column}\\s+`, "i"));
  }
  assert.match(
    sql,
    /unique index[\s\S]*stripe_event_id,\s*notification_kind,\s*recipient_role[\s\S]*where stripe_event_id is not null/i,
  );
  assert.match(sql, /application_event_id bigint references public\.application_events\(id\)/i);
  assert.match(
    sql,
    /check \(\s*\(stripe_event_id is null\) <> \(application_event_id is null\)/i,
  );
  assert.match(
    sql,
    /notification_attempt_kind_source[\s\S]*founder_application_received[\s\S]*application_event_id is not null/i,
  );
  assert.match(
    sql,
    /unique index[\s\S]*application_event_id,\s*notification_kind,\s*recipient_role[\s\S]*where application_event_id is not null/i,
  );
  assert.match(repository, /for update skip locked/i);
  assert.match(repository, /locked_at < now\(\) - interval '5 minutes'/i);
  assert.match(repository, /gen_random_uuid\(\)/i);
  assert.match(
    repository,
    /status = 'sending'[\s\S]*attempt_count[\s\S]*else n\.attempt_count \+ 1/i,
  );
  assert.match(
    repository,
    /where id = \$\{jobId\}[\s\S]*attempt_count = \$\{attemptCount\}[\s\S]*lease_token = \$\{leaseToken\}[\s\S]*returning/i,
  );
  assert.match(repository, /lease_lost/);
});

test("redaction clears notification payload snapshots and fences old workers", async () => {
  const repository = await readFile(repositoryUrl, "utf8");

  assert.match(
    repository,
    /update notification_attempts[\s\S]*payload_to = null[\s\S]*payload_hash = null/i,
  );
  assert.match(repository, /snapshot_country = null[\s\S]*snapshot_region = null/i);
  assert.match(repository, /lease_token = null[\s\S]*locked_at = null/i);
  assert.match(repository, /recipient_unavailable[\s\S]*stale_state/i);
});

test("Stripe application repository enqueues notification jobs in the event transaction", async () => {
  const repository = await readFile(repositoryUrl, "utf8");

  assert.match(repository, /recordStripeEvent[\s\S]*enqueueNotificationJobs/i);
  assert.match(
    repository,
    /on conflict \(stripe_event_id, notification_kind, recipient_role\)[\s\S]*where stripe_event_id is not null do nothing/i,
  );
});

test("migration binds each retry key to one request fingerprint", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /submission_key uuid not null unique/i);
  assert.match(
    sql,
    /submission_fingerprint text not null check \(submission_fingerprint ~ '\^\[a-f0-9\]\{64\}\$'\)/i,
  );
});

test("migration bounds Stripe event identifiers and supported event types", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(
    sql,
    /stripe_event_id text primary key check \(\s*stripe_event_id ~ '\^evt_/i,
  );
  assert.match(
    sql,
    /event_type text not null check \(event_type in \([\s\S]*'checkout\.session\.completed'[\s\S]*'checkout\.session\.async_payment_succeeded'[\s\S]*'charge\.refunded'[\s\S]*'charge\.dispute\.created'[\s\S]*'charge\.dispute\.closed'[\s\S]*\)\)/i,
  );
});

test("migration stores only bounded Stripe financial audit facts", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  for (const column of [
    "event_fact",
    "payment_intent_id",
    "checkout_session_id",
    "amount",
    "amount_refunded",
    "currency",
    "dispute_status",
  ]) {
    assert.match(sql, new RegExp(`${column}\\s+`, "i"));
  }
  for (const fact of [
    "deposit_paid",
    "late_payment",
    "payment_mismatch",
    "full_refund",
    "partial_refund",
    "dispute_created",
    "dispute_closed",
  ]) {
    assert.equal(sql.includes(`'${fact}'`), true);
  }
  for (const status of [
    "warning_needs_response",
    "warning_under_review",
    "warning_closed",
    "needs_response",
    "under_review",
    "won",
    "lost",
  ]) {
    assert.equal(sql.includes(`'${status}'`), true);
  }
});

test("migration enforces the application state graph in Postgres", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /create function public\.enforce_application_state_transition\(\)/i);
  assert.match(
    sql,
    /before update of status[\s\S]*enforce_application_state_transition/i,
  );
  const qualifiedClause = sql.match(
    /old\.status = 'qualified' and new\.status in \(([^)]*)\)/i,
  )?.[1];
  assert.ok(qualifiedClause);
  assert.match(qualifiedClause, /'checkout_created'/i);
  assert.doesNotMatch(qualifiedClause, /'deposit_paid'/i);
});

test("redaction destroys replay linkage while preserving required columns", async () => {
  const repository = await readFile(repositoryUrl, "utf8");

  assert.match(
    repository,
    /set status = 'redacted', submission_key = gen_random_uuid\(\),[\s\S]*submission_fingerprint = encode\(gen_random_bytes\(32\), 'hex'\)/i,
  );
});
