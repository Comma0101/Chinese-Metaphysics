import assert from "node:assert/strict";
import test from "node:test";

import {
  APPLICATION_STATES,
  assertAllowedTransition,
  createTransitionEvent,
  resolvePaymentReferences,
  type ApplicationState,
} from "../lib/server/applications";

const allowed: Record<ApplicationState, readonly ApplicationState[]> = {
  submitted: ["qualified", "declined", "safety_refused", "withdrawn", "redacted"],
  qualified: ["checkout_created", "declined", "safety_refused", "withdrawn", "redacted"],
  declined: ["withdrawn", "redacted"],
  safety_refused: ["withdrawn", "redacted"],
  checkout_created: ["deposit_paid", "safety_refused", "withdrawn", "redacted"],
  deposit_paid: ["deposit_refunded", "safety_refused", "withdrawn", "redacted"],
  deposit_refunded: ["withdrawn", "redacted"],
  withdrawn: ["redacted"],
  redacted: [],
};

test("exposes the complete research-aligned lifecycle", () => {
  assert.deepEqual(APPLICATION_STATES, Object.keys(allowed));
});

test("allows only the explicit forward transitions", () => {
  for (const from of APPLICATION_STATES) {
    for (const to of APPLICATION_STATES) {
      const shouldAllow = allowed[from].includes(to);
      if (shouldAllow) {
        assert.doesNotThrow(() => assertAllowedTransition(from, to));
      } else {
        assert.throws(
          () => assertAllowedTransition(from, to),
          new RegExp(`Cannot transition application from ${from} to ${to}`),
        );
      }
    }
  }
});

test("redacted is terminal", () => {
  for (const next of APPLICATION_STATES) {
    assert.throws(() => assertAllowedTransition("redacted", next));
  }
});

test("creates an auditable transition without sensitive metadata", () => {
  const at = new Date("2026-07-10T20:00:00.000Z");
  assert.deepEqual(
    createTransitionEvent({
      from: "qualified",
      to: "checkout_created",
      actor: "founder",
      reason: "checkout_session_created",
      at,
      metadata: { cohort: "p1" },
    }),
    {
      from: "qualified",
      to: "checkout_created",
      actor: "founder",
      reason: "checkout_session_created",
      occurredAt: at,
      metadata: { cohort: "p1" },
    },
  );

  assert.throws(() =>
    createTransitionEvent({
      from: "qualified",
      to: "checkout_created",
      actor: "founder",
      reason: "checkout_session_created",
      at,
      metadata: { email: "private@example.com" } as never,
    }),
  );
});

test("requires actor, reason, and timestamp for every transition", () => {
  const base = {
    from: "submitted" as const,
    to: "qualified" as const,
    actor: "system",
    reason: "qualification_passed",
    at: new Date("2026-07-10T20:00:00.000Z"),
    metadata: {},
  };

  assert.throws(() => createTransitionEvent({ ...base, actor: "" }));
  assert.throws(() => createTransitionEvent({ ...base, reason: "" }));
  assert.throws(() => createTransitionEvent({ ...base, at: new Date("invalid") }));
});

test("rejects free-form personal data in audit fields", () => {
  const base = {
    from: "submitted" as const,
    to: "qualified" as const,
    actor: "system",
    reason: "qualification_passed",
    metadata: {},
  };

  assert.throws(() =>
    createTransitionEvent({ ...base, actor: "private@example.com" }),
  );
  assert.throws(() =>
    createTransitionEvent({ ...base, reason: "Client private@example.com passed" }),
  );
  assert.throws(() =>
    createTransitionEvent({
      ...base,
      metadata: { cohort: "private@example.com" },
    }),
  );
});

test("accepts only bounded code strings in exact audit metadata keys", () => {
  const base = {
    from: "submitted" as const,
    to: "qualified" as const,
    actor: "system",
    reason: "qualification_passed",
  };
  const invalidValues: unknown[] = [
    1,
    true,
    false,
    null,
    {},
    [],
    "x".repeat(121),
    "contains spaces",
  ];

  for (const value of invalidValues) {
    assert.throws(() =>
      createTransitionEvent({
        ...base,
        metadata: { cohort: value } as never,
      }),
    );
  }
  assert.throws(() =>
    createTransitionEvent({
      ...base,
      metadata: { unexpected: "code" } as never,
    }),
  );
});

test("normalizes and clones audit metadata", () => {
  const metadata = { cohort: " p1 " };
  const event = createTransitionEvent({
    from: "submitted",
    to: "qualified",
    actor: "system",
    reason: "qualification_passed",
    metadata,
  });

  metadata.cohort = "changed";
  assert.deepEqual(event.metadata, { cohort: "p1" });
  assert.notEqual(event.metadata, metadata);
});

test("assigns the checkout session only while entering checkout_created", () => {
  assert.deepEqual(
    resolvePaymentReferences({
      from: "qualified",
      to: "checkout_created",
      currentCheckoutSessionId: null,
      currentPaymentIntentId: null,
      checkoutSessionId: "cs_test_123",
    }),
    {
      checkoutSessionId: "cs_test_123",
      paymentIntentId: null,
    },
  );

  assert.throws(() =>
    resolvePaymentReferences({
      from: "qualified",
      to: "checkout_created",
      currentCheckoutSessionId: null,
      currentPaymentIntentId: null,
    }),
  );
  assert.throws(() =>
    resolvePaymentReferences({
      from: "qualified",
      to: "declined",
      currentCheckoutSessionId: null,
      currentPaymentIntentId: null,
      checkoutSessionId: "cs_wrong_state",
    }),
  );
});

test("assigns the payment intent only while entering deposit_paid", () => {
  assert.deepEqual(
    resolvePaymentReferences({
      from: "checkout_created",
      to: "deposit_paid",
      currentCheckoutSessionId: "cs_test_123",
      currentPaymentIntentId: null,
      checkoutSessionId: "cs_test_123",
      paymentIntentId: "pi_test_123",
    }),
    {
      checkoutSessionId: "cs_test_123",
      paymentIntentId: "pi_test_123",
    },
  );

  assert.throws(() =>
    resolvePaymentReferences({
      from: "checkout_created",
      to: "deposit_paid",
      currentCheckoutSessionId: "cs_test_123",
      currentPaymentIntentId: null,
    }),
  );
  assert.throws(() =>
    resolvePaymentReferences({
      from: "checkout_created",
      to: "deposit_paid",
      currentCheckoutSessionId: null,
      currentPaymentIntentId: null,
      paymentIntentId: "pi_test_123",
    }),
  );
  assert.throws(() =>
    resolvePaymentReferences({
      from: "qualified",
      to: "checkout_created",
      currentCheckoutSessionId: null,
      currentPaymentIntentId: null,
      checkoutSessionId: "cs_test_123",
      paymentIntentId: "pi_wrong_state",
    }),
  );
});

test("payment references are write-once and rejected on unrelated transitions", () => {
  assert.throws(() =>
    resolvePaymentReferences({
      from: "checkout_created",
      to: "deposit_paid",
      currentCheckoutSessionId: "cs_original",
      currentPaymentIntentId: null,
      checkoutSessionId: "cs_different",
      paymentIntentId: "pi_test_123",
    }),
  );
  assert.throws(() =>
    resolvePaymentReferences({
      from: "deposit_paid",
      to: "deposit_refunded",
      currentCheckoutSessionId: "cs_original",
      currentPaymentIntentId: "pi_original",
      paymentIntentId: "pi_different",
    }),
  );
  assert.throws(() =>
    resolvePaymentReferences({
      from: "deposit_paid",
      to: "withdrawn",
      currentCheckoutSessionId: "cs_original",
      currentPaymentIntentId: "pi_original",
      paymentIntentId: "pi_original",
    }),
  );

  assert.deepEqual(
    resolvePaymentReferences({
      from: "deposit_paid",
      to: "deposit_refunded",
      currentCheckoutSessionId: "cs_original",
      currentPaymentIntentId: "pi_original",
      checkoutSessionId: "cs_original",
      paymentIntentId: "pi_original",
    }),
    {
      checkoutSessionId: "cs_original",
      paymentIntentId: "pi_original",
    },
  );
});
