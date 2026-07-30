import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNotificationMessage,
  deliverDueNotificationJobs,
  deliverNotificationJobsForStripeEvent,
  resolveFrozenNotificationPayload,
  notificationJobsForEventFact,
  parseNotificationConfig,
  type ClaimedNotificationJob,
} from "../lib/server/notifications";
import { sendResendEmail } from "../lib/server/resend";
import { loadPilotConfig } from "../lib/server/runtime-config";

const applicationId = "123e4567-e89b-42d3-a456-426614174000";
const eventId = "evt_notification_1";
const eventTimestamp = new Date("2026-07-10T20:00:00.000Z");
const sensitive = [
  "private-client@example.com",
  "San Francisco",
  "career",
  "Should I leave my employer?",
  "1990-01-01",
  "cs_private",
  "pi_private",
];

const config = {
  mode: "send" as const,
  apiKey: "re_test_secret",
  fromEmail: "Zhiji <notifications@zhiji.example>",
  founderEmail: "founder@zhiji.example",
  supportEmail: "support@zhiji.example",
};

const job = (
  overrides: Partial<ClaimedNotificationJob> = {},
): ClaimedNotificationJob => ({
  id: "1",
  applicationId,
  stripeEventId: eventId,
  applicationEventId: null,
  eventFact: "deposit_paid",
  eventOccurredAt: eventTimestamp,
  lifecycleState: "deposit_paid",
  depositAmount: 4_900,
  currency: "usd",
  cohortVersion: "founding-2026-07",
  country: "US",
  region: "California",
  notificationKind: "founder_deposit_paid",
  recipientRole: "founder",
  idempotencyKey: "notify:evt_notification_1:founder_deposit_paid:founder",
  attemptCount: 1,
  leaseToken: "123e4567-e89b-42d3-a456-426614174099",
  clientEmail: null,
  frozenPayload: null,
  ...overrides,
});

const freezePayload = async (
  _jobId: string,
  _attemptCount: number,
  _leaseToken: string,
  message: ReturnType<typeof buildNotificationMessage>,
) => resolveFrozenNotificationPayload(null, message);

test("maps Stripe audit facts to the minimum notification jobs", () => {
  assert.deepEqual(notificationJobsForEventFact("deposit_paid"), [
    { kind: "founder_deposit_paid", recipientRole: "founder" },
    { kind: "client_deposit_paid", recipientRole: "client" },
  ]);
  assert.deepEqual(notificationJobsForEventFact("late_payment"), [
    { kind: "founder_payment_alert", recipientRole: "founder" },
  ]);
  assert.equal(
    notificationJobsForEventFact("late_payment").some(
      (candidate) => candidate.recipientRole === "client",
    ),
    false,
  );
  for (const fact of [
    "payment_mismatch",
    "full_refund",
    "partial_refund",
    "dispute_created",
    "dispute_closed",
  ] as const) {
    assert.deepEqual(notificationJobsForEventFact(fact), [
      { kind: "founder_payment_alert", recipientRole: "founder" },
    ]);
  }
});

test("builds privacy-minimal founder and client plain-text messages", () => {
  const founder = buildNotificationMessage(job(), config);
  const client = buildNotificationMessage(
    job({
      id: "2",
      notificationKind: "client_deposit_paid",
      recipientRole: "client",
      idempotencyKey: "notify:evt_notification_1:client_deposit_paid:client",
      clientEmail: "private-client@example.com",
    }),
    config,
  );

  assert.equal(founder.to, config.founderEmail);
  assert.match(founder.subject, /Meridian/);
  assert.match(founder.text, new RegExp(applicationId));
  assert.match(founder.text, /deposit_paid/);
  assert.match(founder.text, /Event state: deposit_paid/);
  assert.match(founder.text, /Amount: USD 49\.00/);
  assert.match(founder.text, /Cohort: founding-2026-07/);
  assert.match(founder.text, /2026-07-10T20:00:00\.000Z/);
  assert.match(founder.text, /secure Supabase\/CLI/i);
  assert.match(founder.text, /inspect the latest secure record/i);
  assert.doesNotMatch(founder.text, /begin.*calibration/i);

  assert.equal(client.to, "private-client@example.com");
  assert.match(client.subject, /Meridian/);
  assert.match(client.text, new RegExp(applicationId));
  assert.match(client.text, /Event state: deposit_paid/);
  assert.match(client.text, /Amount: USD 49\.00/);
  assert.match(client.text, /support@zhiji\.example/);
  assert.match(client.text, /event was recorded/i);
  assert.doesNotMatch(client.text, /Stripe/i);

  const rendered = JSON.stringify([founder, client]);
  for (const value of sensitive.slice(1)) {
    assert.equal(rendered.includes(value), false, value);
  }
  assert.equal(founder.text.includes("private-client@example.com"), false);
  assert.equal(client.text.includes("private-client@example.com"), false);

});

test("builds a coarse, privacy-minimal founder application notification", () => {
  const message = buildNotificationMessage(
    job({
      stripeEventId: null,
      applicationEventId: "42",
      eventFact: null,
      lifecycleState: "qualified",
      notificationKind: "founder_application_received",
      idempotencyKey: "notify:application_event:42:founder_application_received",
      country: "US",
      region: "Washington",
    }),
    config,
  );

  assert.match(message.subject, /Application received/);
  assert.match(message.text, /Event state: qualified/);
  assert.match(message.text, /Amount: USD 49\.00/);
  assert.match(message.text, /Location: US \/ Washington/);
  assert.match(message.text, /Cohort: founding-2026-07/);
  assert.doesNotMatch(
    message.text,
    /private-client@example\.com|Seattle|career|leave my employer|1990|cs_|pi_/i,
  );
});

test("parses bounded notification settings without exposing secrets", () => {
  assert.deepEqual(
    parseNotificationConfig({
      NOTIFICATION_MODE: "send",
      RESEND_API_KEY: " re_test_secret ",
      RESEND_FROM_EMAIL: " Zhiji <notifications@zhiji.example> ",
      FOUNDER_NOTIFICATION_EMAIL: " founder@zhiji.example ",
      SUPPORT_EMAIL: " support@zhiji.example ",
    }),
    config,
  );

  assert.deepEqual(parseNotificationConfig({ NOTIFICATION_MODE: "disabled" }), {
    mode: "disabled",
  });

  for (const missing of [
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "FOUNDER_NOTIFICATION_EMAIL",
    "SUPPORT_EMAIL",
  ] as const) {
    const env: Record<string, string> = {
      RESEND_API_KEY: "re_test_secret",
      NOTIFICATION_MODE: "send",
      RESEND_FROM_EMAIL: "notifications@zhiji.example",
      FOUNDER_NOTIFICATION_EMAIL: "founder@zhiji.example",
      SUPPORT_EMAIL: "support@zhiji.example",
    };
    delete env[missing];
    assert.throws(() => parseNotificationConfig(env), new RegExp(missing));
  }
  assert.throws(
    () =>
      parseNotificationConfig({
        RESEND_API_KEY: "re_test_secret",
        NOTIFICATION_MODE: "send",
        RESEND_FROM_EMAIL: "notifications@zhiji.example\r\nBcc: victim@example.com",
        FOUNDER_NOTIFICATION_EMAIL: "founder@zhiji.example",
        SUPPORT_EMAIL: "support@zhiji.example",
      }),
    /RESEND_FROM_EMAIL/,
  );
  assert.throws(
    () =>
      parseNotificationConfig({
        RESEND_API_KEY: "re_test_secret",
        NOTIFICATION_MODE: "send",
        RESEND_FROM_EMAIL: "notifications@zhiji.example>",
        FOUNDER_NOTIFICATION_EMAIL: "founder@zhiji.example",
        SUPPORT_EMAIL: "support@zhiji.example",
      }),
    /RESEND_FROM_EMAIL/,
  );
  assert.throws(() => parseNotificationConfig({}), /NOTIFICATION_MODE/);
  assert.throws(
    () => parseNotificationConfig({ NOTIFICATION_MODE: "preview" }),
    /NOTIFICATION_MODE/,
  );
});

test("refuses to enable the paid pilot without complete notification settings", () => {
  const keys = [
    "PAID_PILOT_ENABLED",
    "PILOT_ALLOWED_LOCATIONS",
    "PILOT_ACCESS_CODE_HASH",
    "NEXT_PUBLIC_SITE_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "FOUNDER_NOTIFICATION_EMAIL",
    "SUPPORT_EMAIL",
    "NOTIFICATION_MODE",
    "CRON_SECRET",
  ] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    PAID_PILOT_ENABLED: "true",
    PILOT_ALLOWED_LOCATIONS: "[]",
    PILOT_ACCESS_CODE_HASH: "a".repeat(64),
    NEXT_PUBLIC_SITE_URL: "https://zhiji.example",
    STRIPE_SECRET_KEY: "sk_test_secret",
  });
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.FOUNDER_NOTIFICATION_EMAIL;
  delete process.env.SUPPORT_EMAIL;
  process.env.NOTIFICATION_MODE = "disabled";
  try {
    assert.throws(() => loadPilotConfig(), /NOTIFICATION_MODE.*send/i);
    Object.assign(process.env, {
      NOTIFICATION_MODE: "send",
      RESEND_API_KEY: "re_test_secret",
      RESEND_FROM_EMAIL: "notifications@zhiji.example",
      FOUNDER_NOTIFICATION_EMAIL: "founder@zhiji.example",
      SUPPORT_EMAIL: "support@zhiji.example",
    });
    delete process.env.CRON_SECRET;
    assert.throws(() => loadPilotConfig(), /CRON_SECRET/);
    process.env.CRON_SECRET = "too-short";
    assert.throws(() => loadPilotConfig(), /CRON_SECRET/);
    process.env.CRON_SECRET = "cron-secret-at-least-16";
    delete process.env.STRIPE_WEBHOOK_SECRET;
    assert.throws(() => loadPilotConfig(), /STRIPE_WEBHOOK_SECRET/);
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    assert.equal(loadPilotConfig().enabled, true);
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("disabled notification mode performs no claim or send and keeps webhook retryable", async () => {
  let calls = 0;
  const result = await deliverNotificationJobsForStripeEvent(
    eventId,
    { mode: "disabled" },
    {
      claimJobs: async () => {
        calls += 1;
        return [job()];
      },
      sendEmail: async () => {
        calls += 1;
        return { status: "sent", providerMessageId: "must_not_send" };
      },
      freezePayload: async () => assert.fail("must not freeze"),
      markSent: async () => undefined,
      markFailed: async () => undefined,
      hasRetryableJobs: async () => true,
    },
  );

  assert.equal(calls, 0);
  assert.deepEqual(result, { retryNeeded: true });

  const due = await deliverDueNotificationJobs(
    { mode: "disabled" },
    {
      claimJobs: async () => {
        calls += 1;
        return [job()];
      },
      freezePayload: async () => assert.fail("must not freeze"),
      sendEmail: async () => assert.fail("must not send"),
      markSent: async () => undefined,
      markFailed: async () => undefined,
      hasRetryableJobs: async () => true,
    },
  );
  assert.deepEqual(due, {
    status: "disabled",
    claimed: 0,
    sent: 0,
    failed: 0,
    retryNeeded: true,
  });
});

test("sends the exact Resend request with a bounded idempotency key", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const result = await sendResendEmail(
    config,
    {
      to: "founder@zhiji.example",
      from: config.fromEmail,
      subject: "Zhiji payment",
      text: "Case 123",
      idempotencyKey: "notify:evt_1:founder_payment_alert:founder",
    },
    async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return Response.json({ id: "email_provider_123" }, { status: 200 });
    },
  );

  assert.deepEqual(result, {
    status: "sent",
    providerMessageId: "email_provider_123",
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "https://api.resend.com/emails");
  const headers = new Headers(calls[0]?.init.headers);
  assert.equal(headers.get("authorization"), "Bearer re_test_secret");
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(
    headers.get("idempotency-key"),
    "notify:evt_1:founder_payment_alert:founder",
  );
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), {
    from: config.fromEmail,
    to: "founder@zhiji.example",
    subject: "Zhiji payment",
    text: "Case 123",
  });
  assert.ok(calls[0]?.init.signal instanceof AbortSignal);
});

test("classifies provider and network failures into bounded safe codes", async () => {
  const cases = [
    [429, "rate_limited", true],
    [408, "timeout", true],
    [422, "invalid_request", false],
    [500, "provider_unavailable", true],
  ] as const;
  for (const [status, code, retryable] of cases) {
    const result = await sendResendEmail(
      config,
      {
        from: config.fromEmail,
        to: "founder@zhiji.example",
        subject: "subject",
        text: "text",
        idempotencyKey: `notify:evt_${status}:founder_payment_alert:founder`,
      },
      async () =>
        new Response("private provider payload person@example.com", { status }),
    );
    assert.deepEqual(result, { status: "failed", code, retryable });
    assert.equal(JSON.stringify(result).includes("person@example.com"), false);
  }

  for (const [name, expected] of [
    ["concurrent_idempotent_requests", { code: "concurrent_request", retryable: true }],
    ["invalid_idempotent_request", { code: "invalid_request", retryable: false }],
    ["unknown", { code: "provider_unavailable", retryable: true }],
  ] as const) {
    const result = await sendResendEmail(
      config,
      {
        from: config.fromEmail,
        to: config.founderEmail,
        subject: "subject",
        text: "text",
        idempotencyKey: `notify:409:${name}`,
      },
      async () => Response.json({ name, message: "private body" }, { status: 409 }),
    );
    assert.deepEqual(result, { status: "failed", ...expected });
  }
  const malformed409 = await sendResendEmail(
    config,
    {
      from: config.fromEmail,
      to: config.founderEmail,
      subject: "subject",
      text: "text",
      idempotencyKey: "notify:409:malformed",
    },
    async () => new Response("not-json", { status: 409 }),
  );
  assert.deepEqual(malformed409, {
    status: "failed",
    code: "provider_unavailable",
    retryable: true,
  });

  const network = await sendResendEmail(
    config,
    {
      to: "founder@zhiji.example",
      from: config.fromEmail,
      subject: "subject",
      text: "text",
      idempotencyKey: "notify:evt_network:founder_payment_alert:founder",
    },
    async () => {
      throw new TypeError("private DNS body");
    },
  );
  assert.deepEqual(network, {
    status: "failed",
    code: "provider_unavailable",
    retryable: true,
  });
});

test("marks successful jobs sent and leaves no retry work", async () => {
  const sent: unknown[] = [];
  const result = await deliverNotificationJobsForStripeEvent(eventId, config, {
    claimJobs: async () => [job()],
    freezePayload,
    sendEmail: async () => ({
      status: "sent",
      providerMessageId: "email_provider_123",
    }),
    markSent: async (...args) => sent.push(args),
    markFailed: async () => assert.fail("must not fail"),
    hasRetryableJobs: async () => false,
  });

  assert.deepEqual(sent, [[
    "1",
    1,
    "123e4567-e89b-42d3-a456-426614174099",
    "email_provider_123",
  ]]);
  assert.deepEqual(result, { retryNeeded: false });
});

test("redacted client jobs fail permanently while founder alerts still send", async () => {
  const failed: unknown[] = [];
  const sent: unknown[] = [];
  const result = await deliverNotificationJobsForStripeEvent(eventId, config, {
    claimJobs: async () => [
      job({ eventFact: "late_payment", notificationKind: "founder_payment_alert" }),
      job({
        id: "2",
        eventFact: "late_payment",
        notificationKind: "client_deposit_paid",
        recipientRole: "client",
        idempotencyKey: "notify:evt_notification_1:client_deposit_paid:client",
        clientEmail: null,
      }),
    ],
    freezePayload,
    sendEmail: async (_config, email) => {
      sent.push(email);
      return { status: "sent", providerMessageId: "email_provider_123" };
    },
    markSent: async () => undefined,
    markFailed: async (...args) => failed.push(args),
    hasRetryableJobs: async () => false,
  });

  assert.equal(sent.length, 1);
  assert.deepEqual(failed, [[
    "2",
    "recipient_unavailable",
    false,
    1,
    "123e4567-e89b-42d3-a456-426614174099",
  ]]);
  assert.deepEqual(result, { retryNeeded: false });
});

test("keeps the first frozen payload byte-for-byte after lifecycle and config changes", async () => {
  let stored: ReturnType<typeof buildNotificationMessage> | null = null;
  const delivered: ReturnType<typeof buildNotificationMessage>[] = [];
  const freeze = async (
    _jobId: string,
    _attempt: number,
    _lease: string,
    candidate: ReturnType<typeof buildNotificationMessage>,
  ) => {
    const result = resolveFrozenNotificationPayload(stored, candidate);
    stored = result.message;
    return result;
  };
  const dependencies = {
    claimJobs: async () => [job()],
    freezePayload: freeze,
    sendEmail: async (
      _config: typeof config,
      message: ReturnType<typeof buildNotificationMessage>,
    ) => {
      delivered.push(message);
      return { status: "sent" as const, providerMessageId: "email_frozen" };
    },
    markSent: async () => undefined,
    markFailed: async () => undefined,
    hasRetryableJobs: async () => false,
  };

  await deliverNotificationJobsForStripeEvent(eventId, config, dependencies);
  dependencies.claimJobs = async () => [
    job({ lifecycleState: "deposit_refunded", cohortVersion: "changed" }),
  ];
  await deliverNotificationJobsForStripeEvent(
    eventId,
    {
      ...config,
      fromEmail: "Changed <changed@zhiji.example>",
      founderEmail: "changed-founder@zhiji.example",
    },
    dependencies,
  );

  assert.equal(delivered.length, 2);
  assert.deepEqual(delivered[1], delivered[0]);
  assert.equal(delivered[1]?.from, config.fromEmail);
  assert.equal(delivered[1]?.to, config.founderEmail);
  assert.match(delivered[1]?.text ?? "", /Event state: deposit_paid/);
  assert.doesNotMatch(delivered[1]?.text ?? "", /changed|deposit_refunded/i);
});

test("detects a corrupted frozen payload hash and refuses to send it", async () => {
  let sends = 0;
  const result = await deliverNotificationJobsForStripeEvent(eventId, config, {
    claimJobs: async () => [job()],
    freezePayload: async (_id, _attempt, _lease, candidate) => ({
      ...resolveFrozenNotificationPayload(candidate, candidate, "0".repeat(64)),
    }),
    sendEmail: async () => {
      sends += 1;
      return { status: "sent", providerMessageId: "must_not_send" };
    },
    markSent: async () => assert.fail("must not mark sent"),
    markFailed: async (_id, code, retryable) => {
      assert.equal(code, "invalid_request");
      assert.equal(retryable, false);
    },
    hasRetryableJobs: async () => false,
  });

  assert.equal(sends, 0);
  assert.deepEqual(result, { retryNeeded: false });
});

test("reconciles due jobs and reports safe worker counts", async () => {
  const result = await deliverDueNotificationJobs(config, {
    claimJobs: async (limit) => {
      assert.equal(limit, 10);
      return [job()];
    },
    freezePayload,
    sendEmail: async () => ({
      status: "sent",
      providerMessageId: "email_worker",
    }),
    markSent: async () => undefined,
    markFailed: async () => undefined,
    hasRetryableJobs: async () => false,
  }, 25);
  assert.deepEqual(result, {
    status: "processed",
    claimed: 1,
    sent: 1,
    failed: 0,
    retryNeeded: false,
  });
});

test("persists safe retry state and never resends an already-sent job", async () => {
  const failures: unknown[] = [];
  let sends = 0;
  const failed = await deliverNotificationJobsForStripeEvent(eventId, config, {
    claimJobs: async () => [job()],
    freezePayload,
    sendEmail: async () => {
      sends += 1;
      return { status: "failed", code: "rate_limited", retryable: true };
    },
    markSent: async () => assert.fail("must not send"),
    markFailed: async (...args) => failures.push(args),
    hasRetryableJobs: async () => true,
  });
  assert.deepEqual(failures, [[
    "1",
    "rate_limited",
    true,
    1,
    "123e4567-e89b-42d3-a456-426614174099",
  ]]);
  assert.deepEqual(failed, { retryNeeded: true });

  const replay = await deliverNotificationJobsForStripeEvent(eventId, config, {
    claimJobs: async () => [],
    freezePayload,
    sendEmail: async () => {
      sends += 1;
      return { status: "sent", providerMessageId: "should_not_send" };
    },
    markSent: async () => undefined,
    markFailed: async () => undefined,
    hasRetryableJobs: async () => false,
  });
  assert.equal(sends, 1);
  assert.deepEqual(replay, { retryNeeded: false });
});
