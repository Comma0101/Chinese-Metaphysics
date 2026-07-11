import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type Stripe from "stripe";

import { DEPOSIT_POLICY_VERSION } from "../lib/contracts/pilot";
import {
  planStripeApplicationEvent,
  recordStripeEvent,
  transitionApplication,
  type StripeEventInput,
  type StripeApplicationEvent,
  type StoredApplication,
} from "../lib/server/applications";
import type { DatabaseClient } from "../lib/server/db";
import { deliverNotificationJobsForStripeEvent } from "../lib/server/notifications";
import {
  createStripeWebhookHandler,
  normalizeStripeWebhookEvent,
  PILOT_COHORT_VERSION,
  type NormalizedStripeWebhookEvent,
} from "../lib/server/payments";

const applicationId = "123e4567-e89b-42d3-a456-426614174000";

const application = (
  status: StoredApplication["status"],
  overrides: Partial<StoredApplication> = {},
): StoredApplication => ({
  id: applicationId,
  submissionKey: "123e4567-e89b-42d3-a456-426614174001",
  submissionFingerprint: "a".repeat(64),
  status,
  email: "person@example.com",
  country: "US",
  region: "California",
  city: "San Francisco",
  decisionType: "career",
  decisionWindow: "within_90_days",
  qualificationReasons: [],
  depositAmount: 4_900,
  currency: "usd",
  stripeCheckoutSessionId: null,
  stripePaymentIntentId: null,
  retentionDeleteAfter: new Date("2026-10-10T00:00:00.000Z"),
  redactedAt: null,
  createdAt: new Date("2026-07-10T00:00:00.000Z"),
  updatedAt: new Date("2026-07-10T00:00:00.000Z"),
  ...overrides,
});

const paidEvent = (
  eventType:
    | "checkout.session.completed"
    | "checkout.session.async_payment_succeeded" =
    "checkout.session.completed",
): StripeApplicationEvent => ({
  kind: "paid",
  eventId: "evt_paid_1",
  eventType,
  applicationId,
  checkoutSessionId: "cs_paid_1",
  paymentIntentId: "pi_paid_1",
  amount: 4_900,
  currency: "usd",
});

const webhookRequest = (body = "signed payload", signature = "sig_valid") =>
  new Request("https://zhiji.example/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body,
  });

const stripeEvent = (
  id: string,
  type: string,
  object: Record<string, unknown>,
): Stripe.Event =>
  ({ id, type, data: { object } }) as unknown as Stripe.Event;

const handlerDependencies = (
  normalized: NormalizedStripeWebhookEvent,
  onApply: (event: NormalizedStripeWebhookEvent) => Promise<
    | { status: "processed" | "duplicate" }
    | { status: "ignored"; code: "unknown_application" | "partial_refund" }
    | { status: "retry"; code: "unresolved_payment_reference" }
  > = async () => ({ status: "processed" }),
) => ({
  loadConfig: () => ({
    stripeSecretKey: "sk_test_secret",
    webhookSecret: "whsec_secret",
  }),
  verifyEvent: async (
    _stripeSecretKey: string,
    _webhookSecret: string,
    body: Uint8Array,
    signature: string,
  ) => {
    assert.equal(Buffer.from(body).toString("utf8"), "signed payload");
    assert.equal(signature, "sig_valid");
    return normalized;
  },
  applyEvent: onApply,
  createCorrelationId: () => "corr-webhook-1",
  logger: () => undefined,
});

test("rejects a missing signature without verification or persistence", async () => {
  let verified = 0;
  let applied = 0;
  const handler = createStripeWebhookHandler({
    ...handlerDependencies(paidEvent()),
    verifyEvent: async () => {
      verified += 1;
      return paidEvent();
    },
    applyEvent: async () => {
      applied += 1;
      return { status: "processed" };
    },
  });

  const response = await handler(
    new Request("https://zhiji.example/api/stripe/webhook", {
      method: "POST",
      body: "unsigned",
    }),
  );

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    status: "rejected",
    code: "missing_signature",
  });
  assert.equal(verified, 0);
  assert.equal(applied, 0);
});

test("rejects an invalid signature without persistence", async () => {
  let applied = 0;
  const handler = createStripeWebhookHandler({
    ...handlerDependencies(paidEvent()),
    verifyEvent: async () => {
      throw new Error("signature includes private payload details");
    },
    applyEvent: async () => {
      applied += 1;
      return { status: "processed" };
    },
  });

  const response = await handler(webhookRequest());

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    status: "rejected",
    code: "invalid_signature",
  });
  assert.equal(applied, 0);
});

test("applies a verified paid checkout event", async () => {
  const seen: NormalizedStripeWebhookEvent[] = [];
  const handler = createStripeWebhookHandler(
    handlerDependencies(paidEvent(), async (event) => {
      seen.push(event);
      return { status: "processed" };
    }),
  );

  const response = await handler(webhookRequest());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "processed" });
  assert.deepEqual(seen, [paidEvent()]);
});

test("applies async payment success through the same paid path", async () => {
  const event = paidEvent("checkout.session.async_payment_succeeded");
  const seen: NormalizedStripeWebhookEvent[] = [];
  const handler = createStripeWebhookHandler(
    handlerDependencies(event, async (value) => {
      seen.push(value);
      return { status: "processed" };
    }),
  );

  const response = await handler(webhookRequest());

  assert.equal(response.status, 200);
  assert.deepEqual(seen, [event]);
});

test("normalizes only paid Checkout success events with bounded references", () => {
  const object = {
    id: "cs_paid_1",
    mode: "payment",
    payment_status: "paid",
    payment_intent: "pi_paid_1",
    amount_total: 4_900,
    currency: "usd",
    metadata: {
      applicationId,
      cohortVersion: PILOT_COHORT_VERSION,
      policyVersion: DEPOSIT_POLICY_VERSION,
    },
  };
  for (const type of [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
  ] as const) {
    assert.deepEqual(
      normalizeStripeWebhookEvent(stripeEvent("evt_paid_1", type, object)),
      paidEvent(type),
    );
  }
  assert.deepEqual(
    normalizeStripeWebhookEvent(
      stripeEvent("evt_unpaid_1", "checkout.session.completed", {
        ...object,
        payment_status: "unpaid",
      }),
    ),
    { kind: "ignored", code: "payment_not_paid" },
  );
  assert.deepEqual(
    normalizeStripeWebhookEvent(
      stripeEvent("evt_missing_app", "checkout.session.completed", {
        ...object,
        metadata: {},
      }),
    ),
    { kind: "ignored", code: "missing_application_id" },
  );
});

test("quarantines every paid Checkout economics or policy mismatch", () => {
  const valid = {
    id: "cs_paid_1",
    mode: "payment",
    payment_status: "paid",
    payment_intent: "pi_paid_1",
    amount_total: 4_900,
    currency: "usd",
    metadata: {
      applicationId,
      cohortVersion: PILOT_COHORT_VERSION,
      policyVersion: DEPOSIT_POLICY_VERSION,
    },
  };
  const cases = [
    ["mode", { mode: "subscription" }, "mode"],
    ["currency", { currency: "cad" }, "currency"],
    ["amount", { amount_total: 5_000 }, "amount"],
    [
      "cohort",
      { metadata: { ...valid.metadata, cohortVersion: "other-cohort" } },
      "cohort",
    ],
    [
      "policy",
      { metadata: { ...valid.metadata, policyVersion: "other-policy" } },
      "policy",
    ],
  ] as const;

  for (const [, change, mismatchCode] of cases) {
    const actual = { ...valid, ...change };
    assert.deepEqual(
      normalizeStripeWebhookEvent(
        stripeEvent("evt_payment_mismatch", "checkout.session.completed", actual),
      ),
      {
        kind: "payment_mismatch",
        eventId: "evt_payment_mismatch",
        eventType: "checkout.session.completed",
        applicationId,
        checkoutSessionId: "cs_paid_1",
        paymentIntentId: "pi_paid_1",
        amount: actual.amount_total,
        currency: actual.currency,
        mismatchCode,
      },
    );
  }
});

test("normalizes full and partial charge refunds by amount", () => {
  assert.deepEqual(
    normalizeStripeWebhookEvent(
      stripeEvent("evt_refund_full", "charge.refunded", {
        payment_intent: "pi_paid_1",
        amount: 4_900,
        amount_refunded: 4_900,
        currency: "usd",
      }),
    ),
    {
      kind: "refund",
      eventId: "evt_refund_full",
      eventType: "charge.refunded",
      paymentIntentId: "pi_paid_1",
      full: true,
      amount: 4_900,
      amountRefunded: 4_900,
      currency: "usd",
    },
  );
  assert.deepEqual(
    normalizeStripeWebhookEvent(
      stripeEvent("evt_refund_partial", "charge.refunded", {
        payment_intent: "pi_paid_1",
        amount: 4_900,
        amount_refunded: 1_000,
        currency: "usd",
      }),
    ),
    {
      kind: "refund",
      eventId: "evt_refund_partial",
      eventType: "charge.refunded",
      paymentIntentId: "pi_paid_1",
      full: false,
      amount: 4_900,
      amountRefunded: 1_000,
      currency: "usd",
    },
  );
});

test("normalizes dispute audit events by payment intent without retaining narrative", () => {
  for (const type of [
    "charge.dispute.created",
    "charge.dispute.closed",
  ] as const) {
    assert.deepEqual(
      normalizeStripeWebhookEvent(
        stripeEvent(`evt_${type.endsWith("created") ? "dispute_open" : "dispute_closed"}`, type, {
          id: "dp_private_not_retained",
          payment_intent: "pi_paid_1",
          amount: 4_900,
          currency: "usd",
          status: "warning_needs_response",
          evidence: { customer_email_address: "private@example.com" },
        }),
      ),
      {
        kind: "dispute",
        eventId: `evt_${type.endsWith("created") ? "dispute_open" : "dispute_closed"}`,
        eventType: type,
        paymentIntentId: "pi_paid_1",
        amount: 4_900,
        currency: "usd",
        disputeStatus: "warning_needs_response",
      },
    );
  }
});

test("ignores dispute events with missing or invalid payment intent", () => {
  for (const payment_intent of [null, "not_a_payment_intent"]) {
    assert.deepEqual(
      normalizeStripeWebhookEvent(
        stripeEvent("evt_dispute_bad", "charge.dispute.created", {
          payment_intent,
        }),
      ),
      {
        kind: "ignored",
        code:
          payment_intent === null
            ? "missing_payment_intent"
            : "invalid_processor_reference",
      },
    );
  }
});

test("acknowledges unpaid, unsupported, and metadata-invalid events without persistence", async () => {
  const ignored = [
    "payment_not_paid",
    "unsupported_event",
    "missing_application_id",
  ] as const;

  for (const code of ignored) {
    let applied = 0;
    const handler = createStripeWebhookHandler({
      ...handlerDependencies({ kind: "ignored", code }),
      applyEvent: async () => {
        applied += 1;
        return { status: "processed" };
      },
    });
    const response = await handler(webhookRequest());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ignored", code });
    assert.equal(applied, 0);
  }
});

test("maps duplicate and repository-level ignored outcomes without retrying", async () => {
  const duplicate = createStripeWebhookHandler(
    handlerDependencies(paidEvent(), async () => ({ status: "duplicate" })),
  );
  const unknown = createStripeWebhookHandler(
    handlerDependencies(paidEvent(), async () => ({
      status: "ignored",
      code: "unknown_application",
    })),
  );

  const duplicateResponse = await duplicate(webhookRequest());
  const unknownResponse = await unknown(webhookRequest());
  assert.deepEqual(await duplicateResponse.json(), { status: "duplicate" });
  assert.deepEqual(await unknownResponse.json(), {
    status: "ignored",
    code: "unknown_application",
  });
});

test("commits payment then returns 500 until its durable notifications deliver", async () => {
  const deliveries: string[] = [];
  let attempts = 0;
  const applyResults = [
    { status: "processed" as const },
    { status: "duplicate" as const },
  ];
  const handler = createStripeWebhookHandler({
    ...handlerDependencies(paidEvent(), async () => applyResults.shift()!),
    deliverNotifications: async (eventId) => {
      deliveries.push(eventId);
      attempts += 1;
      return { retryNeeded: attempts === 1 };
    },
  });

  const first = await handler(webhookRequest());
  const retry = await handler(webhookRequest());

  assert.equal(first.status, 500);
  assert.deepEqual(await first.json(), { status: "retry" });
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), { status: "duplicate" });
  assert.deepEqual(deliveries, ["evt_paid_1", "evt_paid_1"]);
});

test("does not acknowledge actionable Stripe work while notifications are disabled", async () => {
  const handler = createStripeWebhookHandler({
    ...handlerDependencies(paidEvent()),
    deliverNotifications: (eventId) =>
      deliverNotificationJobsForStripeEvent(eventId, { mode: "disabled" }),
  });

  const response = await handler(webhookRequest());
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { status: "retry" });
});

test("does not attempt notifications for malformed or unresolved events", async () => {
  let deliveries = 0;
  const ignored = createStripeWebhookHandler({
    ...handlerDependencies({ kind: "ignored", code: "unsupported_event" }),
    deliverNotifications: async () => {
      deliveries += 1;
      return { retryNeeded: false };
    },
  });
  const unresolved = createStripeWebhookHandler({
    ...handlerDependencies(paidEvent(), async () => ({
      status: "retry",
      code: "unresolved_payment_reference",
    })),
    deliverNotifications: async () => {
      deliveries += 1;
      return { retryNeeded: false };
    },
  });

  assert.equal((await ignored(webhookRequest())).status, 200);
  assert.equal((await unresolved(webhookRequest())).status, 500);
  assert.equal(deliveries, 0);
});

test("returns 500 on repository failure with only safe identifiers in logs", async () => {
  const logs: unknown[] = [];
  const handler = createStripeWebhookHandler({
    ...handlerDependencies(paidEvent(), async () => {
      throw new Error("database failed for person@example.com and cs_secret");
    }),
    logger: (entry) => logs.push(entry),
  });

  const response = await handler(webhookRequest());

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("x-request-id"), "corr-webhook-1");
  assert.deepEqual(await response.json(), { status: "retry" });
  assert.deepEqual(logs, [
    {
      correlationId: "corr-webhook-1",
      eventId: "evt_paid_1",
      code: "stripe_webhook_processing_failed",
    },
  ]);
  assert.equal(JSON.stringify(logs).includes("person@example.com"), false);
  assert.equal(JSON.stringify(logs).includes("cs_secret"), false);
});

test("retries a valid refund or dispute until its payment intent is linked", async () => {
  const logs: unknown[] = [];
  const event = {
    kind: "dispute" as const,
    eventId: "evt_dispute_open",
    eventType: "charge.dispute.created" as const,
    paymentIntentId: "pi_paid_1",
  } as unknown as StripeApplicationEvent;
  const handler = createStripeWebhookHandler({
    ...handlerDependencies(event, async () => ({
      status: "retry",
      code: "unresolved_payment_reference",
    })),
    logger: (entry) => logs.push(entry),
  });

  const response = await handler(webhookRequest());

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-request-id"), "corr-webhook-1");
  assert.deepEqual(await response.json(), { status: "retry" });
  assert.deepEqual(logs, [
    {
      correlationId: "corr-webhook-1",
      eventId: "evt_dispute_open",
      code: "stripe_webhook_unresolved_payment_reference",
    },
  ]);
});

test("rejects a declared or streamed raw body over one MiB before verification", async () => {
  let verified = 0;
  const handler = createStripeWebhookHandler({
    ...handlerDependencies(paidEvent()),
    verifyEvent: async () => {
      verified += 1;
      return paidEvent();
    },
  });
  const oversized = "x".repeat(1024 * 1024 + 1);

  for (const request of [
    new Request("https://zhiji.example/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "sig_valid",
        "content-length": String(oversized.length),
      },
      body: "small",
    }),
    webhookRequest(oversized),
  ]) {
    const response = await handler(request);
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), {
      status: "rejected",
      code: "body_too_large",
    });
  }
  assert.equal(verified, 0);
});

test("plans lost-checkout reconciliation before marking a qualified application paid", () => {
  assert.deepEqual(planStripeApplicationEvent(application("qualified"), paidEvent()), {
    kind: "transition",
    transitions: [
      {
        to: "checkout_created",
        actor: "stripe_webhook",
        reason: "checkout_reconciled",
        metadata: {
          processor: "stripe",
          stripeEventType: "checkout.session.completed",
          sourceStatus: "paid",
        },
        stripeCheckoutSessionId: "cs_paid_1",
      },
      {
        to: "deposit_paid",
        actor: "stripe_webhook",
        reason: "checkout_completed",
        metadata: {
          processor: "stripe",
          stripeEventType: "checkout.session.completed",
          sourceStatus: "paid",
        },
        stripeCheckoutSessionId: "cs_paid_1",
        stripePaymentIntentId: "pi_paid_1",
      },
    ],
  });
});

test("blocks public repository transitions from writing payment states", async () => {
  let databaseCalls = 0;
  const fakeDatabase = (() => {
    databaseCalls += 1;
    return [];
  }) as unknown as DatabaseClient;

  for (const to of ["deposit_paid", "deposit_refunded"] as const) {
    await assert.rejects(
      () =>
        transitionApplication(
          applicationId,
          {
            to,
            actor: "system",
            reason: "forbidden_payment_write",
          },
          fakeDatabase,
        ),
      /only the Stripe webhook repository may write payment states/i,
    );
  }
  assert.equal(databaseCalls, 0);
});

test("rejects unbounded Stripe audit facts before issuing SQL", async () => {
  let databaseCalls = 0;
  const fakeDatabase = (() => {
    databaseCalls += 1;
    return [];
  }) as unknown as DatabaseClient;
  const valid: StripeEventInput = {
    eventId: "evt_audit_valid",
    eventType: "checkout.session.completed",
    eventFact: "deposit_paid",
    applicationId,
    paymentIntentId: "pi_audit_valid",
    checkoutSessionId: "cs_audit_valid",
    amount: 4_900,
    amountRefunded: null,
    currency: "usd",
    disputeStatus: null,
  };
  const invalid = [
    { ...valid, eventFact: "free_form" },
    { ...valid, paymentIntentId: "private@example.com" },
    { ...valid, checkoutSessionId: "bad session" },
    { ...valid, amount: -1 },
    { ...valid, amountRefunded: 5_000 },
    { ...valid, currency: "US dollars" },
    { ...valid, disputeStatus: "free form status" },
  ];

  for (const input of invalid) {
    await assert.rejects(
      () => recordStripeEvent(fakeDatabase, input as StripeEventInput),
      /invalid Stripe audit fact/i,
    );
  }
  assert.equal(databaseCalls, 0);
});

test("plans one paid transition from checkout_created", () => {
  assert.deepEqual(
    planStripeApplicationEvent(
      application("checkout_created", {
        stripeCheckoutSessionId: "cs_paid_1",
      }),
      paidEvent(),
    ),
    {
      kind: "transition",
      transitions: [
        {
          to: "deposit_paid",
          actor: "stripe_webhook",
          reason: "checkout_completed",
          metadata: {
            processor: "stripe",
            stripeEventType: "checkout.session.completed",
            sourceStatus: "paid",
          },
          stripeCheckoutSessionId: "cs_paid_1",
          stripePaymentIntentId: "pi_paid_1",
        },
      ],
    },
  );
});

test("records a distinct second success event without another paid transition", () => {
  assert.deepEqual(
    planStripeApplicationEvent(
      application("deposit_paid", {
        stripeCheckoutSessionId: "cs_paid_1",
        stripePaymentIntentId: "pi_paid_1",
      }),
      paidEvent("checkout.session.async_payment_succeeded"),
    ),
    { kind: "record_only" },
  );
});

test("records late payment audit facts without reopening terminal application states", () => {
  for (const status of ["safety_refused", "withdrawn", "redacted"] as const) {
    assert.deepEqual(
      planStripeApplicationEvent(
        application(status, {
          stripeCheckoutSessionId: "cs_paid_1",
          stripePaymentIntentId: null,
        }),
        paidEvent(),
      ),
      { kind: "record_only", code: "late_payment" },
    );
  }
  assert.throws(() =>
    planStripeApplicationEvent(
      application("withdrawn", {
        stripeCheckoutSessionId: "cs_other",
      }),
      paidEvent(),
    ),
  );
});

test("quarantines a verified payment mismatch without changing lifecycle", () => {
  assert.deepEqual(
    planStripeApplicationEvent(
      application("checkout_created", {
        stripeCheckoutSessionId: "cs_paid_1",
      }),
      {
        kind: "payment_mismatch",
        eventId: "evt_payment_mismatch",
        eventType: "checkout.session.completed",
        applicationId,
        checkoutSessionId: "cs_paid_1",
        paymentIntentId: "pi_paid_1",
        amount: 5_000,
        currency: "usd",
        mismatchCode: "amount",
      },
    ),
    { kind: "record_only", code: "payment_mismatch" },
  );
});

test("records a full refund against an audit-linked mismatch without changing state", () => {
  assert.deepEqual(
    planStripeApplicationEvent(
      application("checkout_created", {
        stripeCheckoutSessionId: "cs_paid_1",
        stripePaymentIntentId: null,
      }),
      {
        kind: "refund",
        eventId: "evt_mismatch_refund",
        eventType: "charge.refunded",
        paymentIntentId: "pi_paid_1",
        full: true,
        amount: 4_900,
        amountRefunded: 4_900,
        currency: "usd",
      },
      { paymentReferenceSource: "audit" },
    ),
    { kind: "record_only" },
  );
});

test("rejects paid reference mismatch so the enclosing transaction can roll back", () => {
  assert.throws(() =>
    planStripeApplicationEvent(
      application("checkout_created", {
        stripeCheckoutSessionId: "cs_other",
      }),
      paidEvent(),
    ),
  );
  assert.throws(() =>
    planStripeApplicationEvent(
      application("deposit_paid", {
        stripeCheckoutSessionId: "cs_paid_1",
        stripePaymentIntentId: "pi_other",
      }),
      paidEvent(),
    ),
  );
});

test("plans a full refund transition and a partial refund as record-only", () => {
  const paid = application("deposit_paid", {
    stripeCheckoutSessionId: "cs_paid_1",
    stripePaymentIntentId: "pi_paid_1",
  });
  assert.deepEqual(
    planStripeApplicationEvent(paid, {
      kind: "refund",
      eventId: "evt_refund_full",
      eventType: "charge.refunded",
      paymentIntentId: "pi_paid_1",
      full: true,
      amount: 4_900,
      amountRefunded: 4_900,
      currency: "usd",
    }),
    {
      kind: "transition",
      transitions: [
        {
          to: "deposit_refunded",
          actor: "stripe_webhook",
          reason: "charge_refunded",
          metadata: {
            processor: "stripe",
            stripeEventType: "charge.refunded",
            sourceStatus: "full_refund",
          },
          stripePaymentIntentId: "pi_paid_1",
        },
      ],
    },
  );
  assert.deepEqual(
    planStripeApplicationEvent(paid, {
      kind: "refund",
      eventId: "evt_refund_partial",
      eventType: "charge.refunded",
      paymentIntentId: "pi_paid_1",
      full: false,
      amount: 4_900,
      amountRefunded: 1_000,
      currency: "usd",
    }),
    { kind: "record_only", code: "partial_refund" },
  );
});

test("records a full refund after a non-payment lifecycle exit without reopening state", () => {
  const refund = {
    kind: "refund" as const,
    eventId: "evt_refund_after_exit",
    eventType: "charge.refunded" as const,
    paymentIntentId: "pi_paid_1",
    full: true,
    amount: 4_900,
    amountRefunded: 4_900,
    currency: "usd",
  };
  for (const status of [
    "safety_refused",
    "withdrawn",
    "redacted",
    "deposit_refunded",
  ] as const) {
    assert.deepEqual(
      planStripeApplicationEvent(
        application(status, {
          stripeCheckoutSessionId: "cs_paid_1",
          stripePaymentIntentId: "pi_paid_1",
        }),
        refund,
      ),
      { kind: "record_only" },
    );
  }
});

test("records a known dispute without changing the application lifecycle", () => {
  const paid = application("deposit_paid", {
    stripeCheckoutSessionId: "cs_paid_1",
    stripePaymentIntentId: "pi_paid_1",
  });
  for (const eventType of [
    "charge.dispute.created",
    "charge.dispute.closed",
  ] as const) {
    assert.deepEqual(
      planStripeApplicationEvent(
        paid,
        {
          kind: "dispute",
          eventId: `evt_${eventType.endsWith("created") ? "dispute_open" : "dispute_closed"}`,
          eventType,
          paymentIntentId: "pi_paid_1",
          amount: 4_900,
          currency: "usd",
          disputeStatus: "won",
        } as unknown as StripeApplicationEvent,
      ),
      { kind: "record_only" },
    );
  }
});

test("wires the route to the server-only verifier and atomic repository", async () => {
  const route = await readFile(
    new URL("../app/api/stripe/webhook/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /verifyStripeWebhookEvent/);
  assert.match(route, /applyStripeEvent/);
  assert.match(route, /deliverNotificationJobsForStripeEvent/);
  assert.match(route, /sendResendEmail/);
  assert.match(route, /loadStripeWebhookConfig/);
  assert.match(route, /runtime = "nodejs"/);
});
