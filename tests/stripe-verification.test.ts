import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import Stripe from "stripe";

import { DEPOSIT_POLICY_VERSION } from "../lib/contracts/pilot";
import {
  applyStripeEvent,
  type StripeApplicationEvent,
} from "../lib/server/applications";
import type { DatabaseClient } from "../lib/server/db";
import { PILOT_COHORT_VERSION } from "../lib/server/payments";
import {
  isVerifiedStripeWebhookEvent,
  verifyStripeWebhookEvent,
} from "../lib/server/stripe";

const secret = "whsec_test_exact_bytes";
const stripe = new Stripe("sk_test_capability");
const applicationId = "123e4567-e89b-42d3-a456-426614174000";

const signedPayload = () => {
  const payload = JSON.stringify({
    id: "evt_signed_capability",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_signed_capability",
        mode: "payment",
        payment_status: "paid",
        payment_intent: "pi_signed_capability",
        amount_total: 4_900,
        currency: "usd",
        metadata: {
          applicationId,
          cohortVersion: PILOT_COHORT_VERSION,
          policyVersion: DEPOSIT_POLICY_VERSION,
        },
      },
    },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  return { payload, signature };
};

test("accepts exact signed bytes, registers provenance, and rejects mutation", () => {
  const { payload, signature } = signedPayload();
  const verified = verifyStripeWebhookEvent(
    "sk_test_capability",
    secret,
    Buffer.from(payload),
    signature,
  );

  assert.equal(verified.kind, "paid");
  assert.equal(isVerifiedStripeWebhookEvent(verified), true);

  const mutated = Buffer.from(payload);
  mutated[mutated.length - 2] ^= 1;
  assert.throws(() =>
    verifyStripeWebhookEvent(
      "sk_test_capability",
      secret,
      mutated,
      signature,
    ),
  );
});

test("rejects a fabricated normalized event before any database access", async () => {
  let databaseCalls = 0;
  const fakeDatabase = (() => {
    databaseCalls += 1;
    return [];
  }) as unknown as DatabaseClient;
  const fabricated: StripeApplicationEvent = {
    kind: "paid",
    eventId: "evt_fabricated",
    eventType: "checkout.session.completed",
    applicationId,
    checkoutSessionId: "cs_fabricated",
    paymentIntentId: "pi_fabricated",
    amount: 4_900,
    currency: "usd",
  };

  assert.equal(isVerifiedStripeWebhookEvent(fabricated), false);
  await assert.rejects(
    () => applyStripeEvent(fabricated, fakeDatabase),
    /verified Stripe webhook event/i,
  );
  assert.equal(databaseCalls, 0);
});

test("does not export any public provenance seal", async () => {
  const source = await readFile(
    new URL("../lib/server/stripe.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /export\s+(?:function|const)\s+(?:mark|seal|register)/i);
});

test("returns duplicate before planning a paid replay after refund", async () => {
  const { payload, signature } = signedPayload();
  const verified = verifyStripeWebhookEvent(
    "sk_test_capability",
    secret,
    Buffer.from(payload),
    signature,
  );
  assert.equal(verified.kind, "paid");
  if (verified.kind !== "paid") throw new Error("expected paid fixture");

  const queries: string[] = [];
  const applicationRow = {
    id: applicationId,
    submission_key: "123e4567-e89b-42d3-a456-426614174001",
    submission_fingerprint: "a".repeat(64),
    status: "deposit_refunded",
    email: "person@example.com",
    country: "US",
    region: "California",
    city: "San Francisco",
    decision_type: "career",
    decision_window: "within_90_days",
    qualification_reasons: [],
    deposit_amount: 4_900,
    currency: "usd",
    stripe_checkout_session_id: "cs_signed_capability",
    stripe_payment_intent_id: "pi_signed_capability",
    retention_delete_after: null,
    redacted_at: null,
    created_at: new Date("2026-07-10T00:00:00.000Z"),
    updated_at: new Date("2026-07-10T00:00:00.000Z"),
  };
  const transaction = (async (
    strings: TemplateStringsArray,
  ): Promise<unknown[]> => {
    const query = strings.join("?").replace(/\s+/g, " ").trim();
    queries.push(query);
    if (query.includes("select * from pilot_applications")) {
      return [applicationRow];
    }
    if (query.includes("select exists")) return [{ exists: true }];
    throw new Error(`unexpected query: ${query}`);
  }) as unknown as DatabaseClient;
  (transaction as unknown as { begin: (work: (sql: DatabaseClient) => Promise<unknown>) => Promise<unknown> }).begin =
    (work) => work(transaction);

  assert.deepEqual(await applyStripeEvent(verified, transaction), {
    status: "duplicate",
  });
  assert.equal(queries.length, 2);
  assert.match(queries[0]!, /for update/i);
  assert.match(queries[1]!, /stripe_events/i);
  assert.equal(queries.some((query) => /update pilot_applications/i.test(query)), false);
});
