import assert from "node:assert/strict";
import test from "node:test";

import postgres from "postgres";
import Stripe from "stripe";

import {
  DEPOSIT_POLICY_VERSION,
  PILOT_CONSENT_VERSION,
  PRIVACY_NOTICE_VERSION,
  SOFTWARE_DISCLOSURE_VERSION,
  TERMS_VERSION,
  type NormalizedPilotApplication,
} from "../lib/contracts/pilot";
import {
  applyStripeEvent,
  claimApplicationNotificationJobs,
  claimNotificationJobs,
  createApplication,
  getApplicationById,
  hasProcessedStripeEvent,
  redactApplication,
  redactEligibleRetentionCandidate,
  recordStripeEvent,
  transitionApplication,
} from "../lib/server/applications";
import type { StripeApplicationEvent } from "../lib/server/applications";
import { PILOT_COHORT_VERSION } from "../lib/server/payments";
import { verifyStripeWebhookEvent } from "../lib/server/stripe";

const databaseUrl = process.env.TEST_DATABASE_URL;
const stripe = new Stripe("sk_test_integration");
const webhookSecret = "whsec_integration";

const verifiedEvent = <T extends StripeApplicationEvent>(event: T): T => {
  const object =
    event.kind === "paid" || event.kind === "payment_mismatch"
      ? {
          id: event.checkoutSessionId,
          mode:
            event.kind === "payment_mismatch" && event.mismatchCode === "mode"
              ? "subscription"
              : "payment",
          payment_status: "paid",
          payment_intent: event.paymentIntentId,
          amount_total: event.amount,
          currency: event.currency,
          metadata: {
            applicationId: event.applicationId,
            cohortVersion:
              event.kind === "payment_mismatch" && event.mismatchCode === "cohort"
                ? "mismatch"
                : PILOT_COHORT_VERSION,
            policyVersion:
              event.kind === "payment_mismatch" && event.mismatchCode === "policy"
                ? "mismatch"
                : DEPOSIT_POLICY_VERSION,
          },
        }
      : event.kind === "refund"
        ? {
            payment_intent: event.paymentIntentId,
            amount: event.amount,
            amount_refunded: event.amountRefunded,
            currency: event.currency,
          }
        : {
            payment_intent: event.paymentIntentId,
            amount: event.amount,
            currency: event.currency,
            status: event.disputeStatus,
          };
  const payload = JSON.stringify({
    id: event.eventId,
    object: "event",
    type: event.eventType,
    data: { object },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });
  return verifyStripeWebhookEvent(
    "sk_test_integration",
    webhookSecret,
    Buffer.from(payload),
    signature,
  ) as T;
};
const submissionIdentity = () => ({
  submissionKey: crypto.randomUUID(),
  submissionFingerprint: "a".repeat(64),
});

const eligibleApplication = (): NormalizedPilotApplication => ({
  lang: "en",
  email: `integration-${crypto.randomUUID()}@example.com`,
  country: "US",
  region: "California",
  city: "San Francisco",
  decisionType: "career",
  decisionWindow: "within_90_days",
  ageConfirmed: true,
  priceAcknowledged: true,
  frameworkAccepted: true,
  agencyAccepted: true,
  scopeAccepted: true,
  softwareDisclosureAcknowledged: true,
  privacyConsent: true,
  termsAccepted: true,
  depositPolicyAccepted: true,
  selfOnlyDataConfirmed: true,
  acuteCrisis: false,
  restrictedAdvice: false,
  marketingConsent: false,
  attribution: { source: "integration", friendGraph: "organic" },
  pilotConsentVersion: PILOT_CONSENT_VERSION,
  privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
  termsVersion: TERMS_VERSION,
  depositPolicyVersion: DEPOSIT_POLICY_VERSION,
  softwareDisclosureVersion: SOFTWARE_DISCLOSURE_VERSION,
});

test(
  "records a Stripe event exactly once",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    const eventId = `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`;
    const input = {
      eventId,
      eventType: "checkout.session.completed",
      eventFact: "deposit_paid" as const,
      applicationId: null,
      paymentIntentId: "pi_test_direct",
      checkoutSessionId: "cs_test_direct",
      amount: 4_900,
      amountRefunded: null,
      currency: "usd",
      disputeStatus: null,
    };

    try {
      assert.equal(
        await recordStripeEvent(sql, input),
        true,
      );
      assert.equal(
        await recordStripeEvent(sql, input),
        false,
      );
      assert.equal(await hasProcessedStripeEvent(sql, eventId), true);
    } finally {
      await sql`delete from stripe_events where stripe_event_id = ${eventId}`;
      await sql.end();
    }
  },
);

test(
  "redacts applicant data while retaining the payment-safe case record",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    const application = eligibleApplication();

    let applicationId: string | undefined;
    try {
      const created = await createApplication(
        application,
        { status: "qualified", reasons: [] },
        submissionIdentity(),
        sql,
      );
      applicationId = created.id;
      const redacted = await redactApplication(
        created.id,
        "privacy_operator",
        "subject_erasure_request",
        sql,
      );

      assert.equal(redacted.status, "redacted");
      assert.notEqual(redacted.submissionKey, created.submissionKey);
      assert.notEqual(redacted.submissionFingerprint, created.submissionFingerprint);
      assert.match(redacted.submissionFingerprint, /^[a-f0-9]{64}$/);
      assert.equal(redacted.email, null);
      assert.equal(redacted.region, null);
      assert.ok(redacted.redactedAt instanceof Date);

      const rows = await sql<{
        acute_crisis: boolean | null;
        marketing_consent: boolean | null;
      }[]>`
        select acute_crisis, marketing_consent
        from pilot_applications where id = ${created.id}
      `;
      assert.deepEqual(rows[0], {
        acute_crisis: null,
        marketing_consent: null,
      });
    } finally {
      if (applicationId) {
        await sql`delete from pilot_applications where id = ${applicationId}`;
      }
      await sql.end();
    }
  },
);

test(
  "retention waits for a concurrent payment and does not redact the paid case",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const paymentSql = postgres(databaseUrl!, { prepare: false, max: 1 });
    const retentionSql = postgres(databaseUrl!, { prepare: false, max: 1 });
    let applicationId: string | undefined;
    let releasePayment!: () => void;
    let paymentLocked!: () => void;
    const release = new Promise<void>((resolve) => {
      releasePayment = resolve;
    });
    const locked = new Promise<void>((resolve) => {
      paymentLocked = resolve;
    });

    try {
      const created = await createApplication(
        eligibleApplication(),
        { status: "qualified", reasons: [] },
        submissionIdentity(),
        paymentSql,
      );
      applicationId = created.id;
      const checkoutSessionId = `cs_test_${crypto.randomUUID().replaceAll("-", "_")}`;
      const paymentIntentId = `pi_test_${crypto.randomUUID().replaceAll("-", "_")}`;
      await transitionApplication(
        created.id,
        {
          to: "checkout_created",
          actor: "system",
          reason: "checkout_session_created",
          stripeCheckoutSessionId: checkoutSessionId,
        },
        paymentSql,
      );
      await paymentSql`
        update pilot_applications
        set retention_delete_after = now() - interval '1 day'
        where id = ${created.id}
      `;
      const paymentEvent = verifiedEvent({
        kind: "paid",
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        eventType: "checkout.session.completed",
        applicationId: created.id,
        checkoutSessionId,
        paymentIntentId,
        amount: 4_900,
        currency: "usd",
      });

      const payment = paymentSql.begin(async (transaction) => {
        await transaction`
          select id from pilot_applications where id = ${created.id} for update
        `;
        paymentLocked();
        await release;
        return applyStripeEvent(paymentEvent, transaction);
      });
      await locked;
      const retention = redactEligibleRetentionCandidate(
        created.id,
        new Date(),
        "founder_cli",
        "retention_expired",
        retentionSql,
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      releasePayment();

      assert.deepEqual(await payment, { status: "processed" });
      assert.equal(await retention, null);
      const stored = await getApplicationById(created.id, paymentSql);
      assert.equal(stored?.status, "deposit_paid");
      assert.equal(stored?.redactedAt, null);
    } finally {
      releasePayment?.();
      if (applicationId) {
        await paymentSql`delete from pilot_applications where id = ${applicationId}`;
      }
      await Promise.all([paymentSql.end(), retentionSql.end()]);
    }
  },
);

test(
  "rejects a mismatched payment reference without changing state or events",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    let applicationId: string | undefined;

    try {
      const created = await createApplication(
        eligibleApplication(),
        { status: "qualified", reasons: [] },
        submissionIdentity(),
        sql,
      );
      applicationId = created.id;
      await transitionApplication(
        created.id,
        {
          to: "checkout_created",
          actor: "system",
          reason: "checkout_session_created",
          stripeCheckoutSessionId: "cs_original",
        },
        sql,
      );
      const before = await sql<{ count: number }[]>`
        select count(*)::int as count from application_events
        where application_id = ${created.id}
      `;

      await assert.rejects(() =>
        transitionApplication(
          created.id,
          {
            to: "deposit_paid",
            actor: "stripe_webhook",
            reason: "checkout_completed",
            stripeCheckoutSessionId: "cs_mismatch",
            stripePaymentIntentId: "pi_test_123",
          },
          sql,
        ),
      );

      const after = await sql<{
        status: string;
        stripe_checkout_session_id: string | null;
        stripe_payment_intent_id: string | null;
        event_count: number;
      }[]>`
        select a.status, a.stripe_checkout_session_id,
               a.stripe_payment_intent_id, count(e.id)::int as event_count
        from pilot_applications a
        left join application_events e on e.application_id = a.id
        where a.id = ${created.id}
        group by a.id
      `;
      assert.deepEqual(after[0], {
        status: "checkout_created",
        stripe_checkout_session_id: "cs_original",
        stripe_payment_intent_id: null,
        event_count: before[0]!.count,
      });
    } finally {
      if (applicationId) {
        await sql`delete from pilot_applications where id = ${applicationId}`;
      }
      await sql.end();
    }
  },
);

test(
  "reuses an identical submission without duplicating consent or events",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    const application = eligibleApplication();
    const submission = submissionIdentity();
    let applicationId: string | undefined;

    try {
      const first = await createApplication(
        application,
        { status: "qualified", reasons: [] },
        submission,
        sql,
      );
      applicationId = first.id;
      const intakeJobs = await claimApplicationNotificationJobs(first.id, sql);
      assert.equal(intakeJobs.length, 1);
      assert.equal(intakeJobs[0]?.notificationKind, "founder_application_received");
      assert.equal(intakeJobs[0]?.lifecycleState, "qualified");
      assert.equal(intakeJobs[0]?.depositAmount, 4_900);
      assert.equal(intakeJobs[0]?.currency, "usd");
      assert.equal(intakeJobs[0]?.country, "US");
      assert.equal(intakeJobs[0]?.region, "California");
      assert.equal(intakeJobs[0]?.eventFact, null);
      const replay = await createApplication(
        application,
        { status: "qualified", reasons: [] },
        submission,
        sql,
      );
      assert.equal(replay.id, first.id);

      const counts = await sql<{
        consents: number;
        events: number;
        notifications: number;
      }[]>`
        select
          (select count(*)::int from application_consents where application_id = ${first.id}) as consents,
          (select count(*)::int from application_events where application_id = ${first.id}) as events,
          (select count(*)::int from notification_attempts where application_id = ${first.id}) as notifications
      `;
      assert.deepEqual(counts[0], {
        consents: 1,
        events: 2,
        notifications: 1,
      });

      await assert.rejects(
        () =>
          createApplication(
            application,
            { status: "qualified", reasons: [] },
            { ...submission, submissionFingerprint: "b".repeat(64) },
            sql,
          ),
        { name: "SubmissionConflictError" },
      );
    } finally {
      if (applicationId) {
        await sql`delete from pilot_applications where id = ${applicationId}`;
      }
      await sql.end();
    }
  },
);

test(
  "atomically reconciles paid events, deduplicates retries, and records refunds",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    let applicationId: string | undefined;
    try {
      const created = await createApplication(
        eligibleApplication(),
        { status: "qualified", reasons: [] },
        submissionIdentity(),
        sql,
      );
      applicationId = created.id;
      const completed = {
        kind: "paid" as const,
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        eventType: "checkout.session.completed" as const,
        applicationId: created.id,
        checkoutSessionId: `cs_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        paymentIntentId: `pi_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        amount: 4_900,
        currency: "usd",
      };

      assert.deepEqual(await applyStripeEvent(verifiedEvent(completed), sql), {
        status: "processed",
      });
      assert.deepEqual(await applyStripeEvent(verifiedEvent(completed), sql), {
        status: "duplicate",
      });
      const asyncSuccess = {
        ...completed,
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        eventType: "checkout.session.async_payment_succeeded" as const,
      };
      assert.deepEqual(await applyStripeEvent(verifiedEvent(asyncSuccess), sql), {
        status: "processed",
      });

      const dispute = {
        kind: "dispute" as const,
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        eventType: "charge.dispute.created" as const,
        paymentIntentId: completed.paymentIntentId,
        amount: 4_900,
        currency: "usd",
        disputeStatus: "needs_response" as const,
      };
      assert.deepEqual(await applyStripeEvent(verifiedEvent(dispute), sql), {
        status: "processed",
      });
      assert.deepEqual(await applyStripeEvent(verifiedEvent(dispute), sql), {
        status: "duplicate",
      });
      assert.equal((await getApplicationById(created.id, sql))?.status, "deposit_paid");

      const partialRefund = {
        kind: "refund" as const,
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        eventType: "charge.refunded" as const,
        paymentIntentId: completed.paymentIntentId,
        full: false,
        amount: 4_900,
        amountRefunded: 1_000,
        currency: "usd",
      };
      assert.deepEqual(await applyStripeEvent(verifiedEvent(partialRefund), sql), {
        status: "ignored",
        code: "partial_refund",
      });
      assert.equal((await getApplicationById(created.id, sql))?.status, "deposit_paid");

      const fullRefund = {
        ...partialRefund,
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        full: true,
        amountRefunded: 4_900,
      };
      assert.deepEqual(await applyStripeEvent(verifiedEvent(fullRefund), sql), {
        status: "processed",
      });
      assert.equal(
        (await getApplicationById(created.id, sql))?.status,
        "deposit_refunded",
      );
      assert.deepEqual(await applyStripeEvent(verifiedEvent(completed), sql), {
        status: "duplicate",
      });

      const eventCounts = await sql<{ transitions: number; stripe_events: number }[]>`
        select
          (select count(*)::int from application_events where application_id = ${created.id}) as transitions,
          (select count(*)::int from stripe_events where application_id = ${created.id}) as stripe_events
      `;
      assert.deepEqual(eventCounts[0], { transitions: 5, stripe_events: 5 });
    } finally {
      if (applicationId) {
        await sql`delete from pilot_applications where id = ${applicationId}`;
      }
      await sql.end();
    }
  },
);

test(
  "retries an out-of-order refund until the paid event links its payment intent",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    let applicationId: string | undefined;
    const paymentIntentId = `pi_test_${crypto.randomUUID().replaceAll("-", "_")}`;
    const refundEventId = `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`;
    try {
      const created = await createApplication(
        eligibleApplication(),
        { status: "qualified", reasons: [] },
        submissionIdentity(),
        sql,
      );
      applicationId = created.id;
      const refund = {
        kind: "refund" as const,
        eventId: refundEventId,
        eventType: "charge.refunded" as const,
        paymentIntentId,
        full: true,
        amount: 4_900,
        amountRefunded: 4_900,
        currency: "usd",
      };

      assert.deepEqual(await applyStripeEvent(verifiedEvent(refund), sql), {
        status: "retry",
        code: "unresolved_payment_reference",
      });
      assert.equal(await hasProcessedStripeEvent(sql, refundEventId), false);

      assert.deepEqual(
        await applyStripeEvent(
          verifiedEvent({
            kind: "paid",
            eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
            eventType: "checkout.session.completed",
            applicationId: created.id,
            checkoutSessionId: `cs_test_${crypto.randomUUID().replaceAll("-", "_")}`,
            paymentIntentId,
            amount: 4_900,
            currency: "usd",
          }),
          sql,
        ),
        { status: "processed" },
      );
      assert.deepEqual(await applyStripeEvent(verifiedEvent(refund), sql), {
        status: "processed",
      });
      assert.equal(await hasProcessedStripeEvent(sql, refundEventId), true);
      assert.equal(
        (await getApplicationById(created.id, sql))?.status,
        "deposit_refunded",
      );
    } finally {
      if (applicationId) {
        await sql`delete from pilot_applications where id = ${applicationId}`;
      }
      await sql.end();
    }
  },
);

test(
  "rolls back the Stripe event insert when payment references mismatch",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    let applicationId: string | undefined;
    const eventId = `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`;
    try {
      const created = await createApplication(
        eligibleApplication(),
        { status: "qualified", reasons: [] },
        submissionIdentity(),
        sql,
      );
      applicationId = created.id;
      await transitionApplication(
        created.id,
        {
          to: "checkout_created",
          actor: "system",
          reason: "checkout_session_created",
          stripeCheckoutSessionId: "cs_test_original",
        },
        sql,
      );

      await assert.rejects(() =>
        applyStripeEvent(
          verifiedEvent({
            kind: "paid",
            eventId,
            eventType: "checkout.session.completed",
            applicationId: created.id,
            checkoutSessionId: "cs_test_mismatch",
            paymentIntentId: "pi_test_mismatch",
            amount: 4_900,
            currency: "usd",
          }),
          sql,
        ),
      );

      assert.equal(await hasProcessedStripeEvent(sql, eventId), false);
      const stored = await getApplicationById(created.id, sql);
      assert.equal(stored?.status, "checkout_created");
      assert.equal(stored?.stripeCheckoutSessionId, "cs_test_original");
      assert.equal(stored?.stripePaymentIntentId, null);
    } finally {
      if (applicationId) {
        await sql`delete from pilot_applications where id = ${applicationId}`;
      }
      await sql.end();
    }
  },
);

test(
  "records late payment and a later refund through the audit payment-intent link",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    let applicationId: string | undefined;
    try {
      const created = await createApplication(
        eligibleApplication(),
        { status: "qualified", reasons: [] },
        submissionIdentity(),
        sql,
      );
      applicationId = created.id;
      const checkoutSessionId = `cs_test_${crypto.randomUUID().replaceAll("-", "_")}`;
      const paymentIntentId = `pi_test_${crypto.randomUUID().replaceAll("-", "_")}`;
      await transitionApplication(
        created.id,
        {
          to: "checkout_created",
          actor: "system",
          reason: "checkout_session_created",
          stripeCheckoutSessionId: checkoutSessionId,
        },
        sql,
      );
      await transitionApplication(
        created.id,
        {
          to: "withdrawn",
          actor: "privacy_operator",
          reason: "client_withdrew",
        },
        sql,
      );

      const latePayment = verifiedEvent({
        kind: "paid",
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        eventType: "checkout.session.completed",
        applicationId: created.id,
        checkoutSessionId,
        paymentIntentId,
        amount: 4_900,
        currency: "usd",
      });
      assert.deepEqual(await applyStripeEvent(latePayment, sql), {
        status: "processed",
      });
      const lateNotifications = await sql<{
        notification_kind: string;
        recipient_role: string;
      }[]>`
        select notification_kind, recipient_role from notification_attempts
        where stripe_event_id = ${latePayment.eventId}
      `;
      assert.deepEqual(lateNotifications, [
        {
          notification_kind: "founder_payment_alert",
          recipient_role: "founder",
        },
      ]);
      let stored = await getApplicationById(created.id, sql);
      assert.equal(stored?.status, "withdrawn");
      assert.equal(stored?.stripePaymentIntentId, null);

      const refund = verifiedEvent({
        kind: "refund",
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        eventType: "charge.refunded",
        paymentIntentId,
        full: true,
        amount: 4_900,
        amountRefunded: 4_900,
        currency: "usd",
      });
      assert.deepEqual(await applyStripeEvent(refund, sql), {
        status: "processed",
      });
      stored = await getApplicationById(created.id, sql);
      assert.equal(stored?.status, "withdrawn");

      const facts = await sql<{ event_fact: string; payment_intent_id: string }[]>`
        select event_fact, payment_intent_id from stripe_events
        where application_id = ${created.id}
        order by processed_at
      `;
      assert.deepEqual(facts, [
        { event_fact: "late_payment", payment_intent_id: paymentIntentId },
        { event_fact: "full_refund", payment_intent_id: paymentIntentId },
      ]);
    } finally {
      if (applicationId) {
        await sql`delete from pilot_applications where id = ${applicationId}`;
      }
      await sql.end();
    }
  },
);

test(
  "database state trigger rejects a direct qualified to paid update",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    let applicationId: string | undefined;
    try {
      const created = await createApplication(
        eligibleApplication(),
        { status: "qualified", reasons: [] },
        submissionIdentity(),
        sql,
      );
      applicationId = created.id;
      await assert.rejects(() => sql`
        update pilot_applications set status = 'deposit_paid'
        where id = ${created.id}
      `);
      assert.equal((await getApplicationById(created.id, sql))?.status, "qualified");
    } finally {
      if (applicationId) {
        await sql`delete from pilot_applications where id = ${applicationId}`;
      }
      await sql.end();
    }
  },
);

test(
  "quarantines a payment mismatch with financial audit facts and no state change",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    let applicationId: string | undefined;
    try {
      const created = await createApplication(
        eligibleApplication(),
        { status: "qualified", reasons: [] },
        submissionIdentity(),
        sql,
      );
      applicationId = created.id;
      const checkoutSessionId = `cs_test_${crypto.randomUUID().replaceAll("-", "_")}`;
      await transitionApplication(
        created.id,
        {
          to: "checkout_created",
          actor: "system",
          reason: "checkout_session_created",
          stripeCheckoutSessionId: checkoutSessionId,
        },
        sql,
      );
      const mismatch = verifiedEvent({
        kind: "payment_mismatch",
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        eventType: "checkout.session.completed",
        applicationId: created.id,
        checkoutSessionId,
        paymentIntentId: `pi_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        amount: 5_000,
        currency: "usd",
        mismatchCode: "amount",
      });

      assert.deepEqual(await applyStripeEvent(mismatch, sql), {
        status: "processed",
      });
      const stored = await getApplicationById(created.id, sql);
      assert.equal(stored?.status, "checkout_created");
      assert.equal(stored?.stripePaymentIntentId, null);
      const facts = await sql<{
        event_fact: string;
        amount: number;
        currency: string;
      }[]>`
        select event_fact, amount, currency from stripe_events
        where stripe_event_id = ${mismatch.eventId}
      `;
      assert.deepEqual(facts[0], {
        event_fact: "payment_mismatch",
        amount: 5_000,
        currency: "usd",
      });
      const mismatchRefund = verifiedEvent({
        kind: "refund",
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        eventType: "charge.refunded",
        paymentIntentId: mismatch.paymentIntentId,
        full: true,
        amount: 5_000,
        amountRefunded: 5_000,
        currency: "usd",
      });
      assert.deepEqual(await applyStripeEvent(mismatchRefund, sql), {
        status: "processed",
      });
      assert.equal((await getApplicationById(created.id, sql))?.status, "checkout_created");
      assert.equal(
        (await getApplicationById(created.id, sql))?.stripePaymentIntentId,
        null,
      );
      await transitionApplication(
        created.id,
        {
          to: "withdrawn",
          actor: "privacy_operator",
          reason: "client_withdrew",
        },
        sql,
      );
      assert.deepEqual(await applyStripeEvent(verifiedEvent(mismatch), sql), {
        status: "duplicate",
      });
      assert.equal((await getApplicationById(created.id, sql))?.status, "withdrawn");
    } finally {
      if (applicationId) {
        await sql`delete from pilot_applications where id = ${applicationId}`;
      }
      await sql.end();
    }
  },
);

test(
  "concurrent duplicate Stripe delivery creates one event and one transition",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const first = postgres(databaseUrl!, { prepare: false, max: 1 });
    const second = postgres(databaseUrl!, { prepare: false, max: 1 });
    let applicationId: string | undefined;
    try {
      const created = await createApplication(
        eligibleApplication(),
        { status: "qualified", reasons: [] },
        submissionIdentity(),
        first,
      );
      applicationId = created.id;
      const event = verifiedEvent({
        kind: "paid",
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        eventType: "checkout.session.completed",
        applicationId: created.id,
        checkoutSessionId: `cs_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        paymentIntentId: `pi_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        amount: 4_900,
        currency: "usd",
      });

      const results = await Promise.all([
        applyStripeEvent(event, first),
        applyStripeEvent(event, second),
      ]);
      assert.deepEqual(
        results.map((result) => result.status).sort(),
        ["duplicate", "processed"],
      );
      const counts = await first<{ events: number; transitions: number }[]>`
        select
          (select count(*)::int from stripe_events where stripe_event_id = ${event.eventId}) as events,
          (select count(*)::int from application_events
           where application_id = ${created.id} and to_state = 'deposit_paid') as transitions
      `;
      assert.deepEqual(counts[0], { events: 1, transitions: 1 });
    } finally {
      if (applicationId) {
        await first`delete from pilot_applications where id = ${applicationId}`;
      }
      await Promise.all([first.end(), second.end()]);
    }
  },
);

test(
  "claims each notification once, reclaims stale work, and stops after five attempts",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const first = postgres(databaseUrl!, { prepare: false, max: 1 });
    const second = postgres(databaseUrl!, { prepare: false, max: 1 });
    let applicationId: string | undefined;
    try {
      const created = await createApplication(
        eligibleApplication(),
        { status: "qualified", reasons: [] },
        submissionIdentity(),
        first,
      );
      applicationId = created.id;
      const event = verifiedEvent({
        kind: "paid",
        eventId: `evt_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        eventType: "checkout.session.completed",
        applicationId: created.id,
        checkoutSessionId: `cs_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        paymentIntentId: `pi_test_${crypto.randomUUID().replaceAll("-", "_")}`,
        amount: 4_900,
        currency: "usd",
      });
      await applyStripeEvent(event, first);

      const claimed = (
        await Promise.all([
          claimNotificationJobs(event.eventId, first),
          claimNotificationJobs(event.eventId, second),
        ])
      ).flat();
      assert.equal(claimed.length, 2);
      assert.equal(new Set(claimed.map((job) => job.id)).size, 2);

      const stale = claimed[0]!;
      const exhausted = claimed[1]!;
      await first`
        update notification_attempts
        set status = 'sending', attempt_count = 5,
            locked_at = now() - interval '6 minutes', next_attempt_at = now()
        where id = ${stale.id}
      `;
      await first`
        update notification_attempts
        set status = 'failed', attempt_count = 5,
            last_error_code = 'stale_state', locked_at = null,
            lease_token = null,
            next_attempt_at = null
        where id = ${exhausted.id}
      `;

      const reclaimed = await claimNotificationJobs(event.eventId, first);
      assert.deepEqual(reclaimed.map((job) => job.id), [stale.id]);
      assert.equal(reclaimed[0]?.attemptCount, 5);

      await first`
        update notification_attempts
        set status = 'failed', attempt_count = 5,
            last_error_code = 'invalid_request', locked_at = null,
            lease_token = null,
            next_attempt_at = null
        where id = ${stale.id}
      `;
      assert.deepEqual(await claimNotificationJobs(event.eventId, first), []);
    } finally {
      if (applicationId) {
        await first`delete from pilot_applications where id = ${applicationId}`;
      }
      await Promise.all([first.end(), second.end()]);
    }
  },
);
