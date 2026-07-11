import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEPOSIT_POLICY_VERSION,
  PILOT_CONSENT_VERSION,
  PRIVACY_NOTICE_VERSION,
  SOFTWARE_DISCLOSURE_VERSION,
  TERMS_VERSION,
  type NormalizedPilotApplication,
  type PilotApplicationRequest,
} from "../lib/contracts/pilot";
import { POST as retireFreeApplication } from "../app/api/free/route";
import { SubmissionConflictError } from "../lib/server/applications";
import { parsePilotConfig } from "../lib/server/config";
import {
  DEPOSIT_AMOUNT_CENTS,
  DEPOSIT_CURRENCY,
  PILOT_COHORT_VERSION,
  buildDepositCheckoutParams,
  buildStripeIdempotencyKey,
  createSubmissionFingerprint,
  createCheckoutPostHandler,
  createCheckoutStatusHandler,
} from "../lib/server/payments";

const allowedLocation = [
  { country: "US" as const, region: "Washington", city: "Seattle" },
];
const accessCode = "founding-pilot-access";
const accessCodeHash = createHash("sha256").update(accessCode).digest("hex");
const enabledConfig = {
  enabled: true as const,
  allowedLocations: allowedLocation,
  siteUrl: "https://zhiji.example",
  stripeSecretKey: "sk_test_secret",
  accessCodeHash,
};

const eligibleApplication = (): PilotApplicationRequest => ({
  lang: "en",
  email: "person@example.com",
  country: "US",
  region: "Washington",
  city: "Seattle",
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
  pilotConsentVersion: PILOT_CONSENT_VERSION,
  privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
  termsVersion: TERMS_VERSION,
  depositPolicyVersion: DEPOSIT_POLICY_VERSION,
  softwareDisclosureVersion: SOFTWARE_DISCLOSURE_VERSION,
});

const checkoutRequest = (
  body: unknown,
  origin = "https://attacker.example",
  headers: Record<string, string> = {},
): Request =>
  new Request("https://internal.example/api/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-pilot-access-code": accessCode,
      "idempotency-key": randomUUID(),
      ...headers,
    },
    body: JSON.stringify(body),
  });

const streamingCheckoutRequest = (
  chunks: Uint8Array[],
  contentLength?: string,
): { request: Request; wasCanceled: () => boolean } => {
  let index = 0;
  let canceled = false;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[index++];
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel() {
        canceled = true;
      },
    },
    { highWaterMark: 0 },
  );
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-pilot-access-code": accessCode,
    "idempotency-key": randomUUID(),
  };
  if (contentLength !== undefined) headers["content-length"] = contentLength;
  return {
    request: new Request("https://zhiji.example/api/checkout", {
      method: "POST",
      headers,
      body: stream,
      duplex: "half",
    } as RequestInit),
    wasCanceled: () => canceled,
  };
};

test("keeps the paid pilot closed when the kill switch is absent", () => {
  assert.deepEqual(parsePilotConfig({}), {
    enabled: false,
    allowedLocations: [],
  });
});

test("parses only an explicit JSON location allowlist", () => {
  const locations = [
    { country: "US", region: "Washington", city: "Seattle" },
    { country: "CA", region: "Ontario", city: "Toronto" },
  ];

  const base = {
    PAID_PILOT_ENABLED: "true",
    PILOT_ALLOWED_LOCATIONS: JSON.stringify(locations),
    NEXT_PUBLIC_SITE_URL: "https://zhiji.example",
    STRIPE_SECRET_KEY: "sk_test_secret",
    PILOT_ACCESS_CODE_HASH: accessCodeHash,
  };
  assert.deepEqual(parsePilotConfig(base).allowedLocations, locations);

  for (const value of [
    "US,CA",
    "{}",
    '[{"country":"OTHER","region":"x","city":"y"}]',
    '[{"country":"US","region":"","city":"Seattle"}]',
    '[{"country":"US","region":"Washington","city":"Seattle","extra":true}]',
  ]) {
    assert.throws(() =>
      parsePilotConfig({ ...base, PILOT_ALLOWED_LOCATIONS: value }),
    );
  }

  assert.throws(() =>
    parsePilotConfig({
      ...base,
      PILOT_ALLOWED_LOCATIONS: JSON.stringify(
        Array.from({ length: 51 }, (_, index) => ({
          country: "US",
          region: "Washington",
          city: `Seattle-${index}`,
        })),
      ),
    }),
  );
  assert.throws(() =>
    parsePilotConfig({
      ...base,
      PILOT_ALLOWED_LOCATIONS: JSON.stringify([
        { country: "US", region: "x".repeat(121), city: "Seattle" },
      ]),
    }),
  );
});

test("requires a canonical site origin and Stripe key only when enabled", () => {
  const env = {
    PAID_PILOT_ENABLED: "true",
    PILOT_ALLOWED_LOCATIONS:
      '[{"country":"US","region":"Washington","city":"Seattle"}]',
    NEXT_PUBLIC_SITE_URL: "https://zhiji.example",
    STRIPE_SECRET_KEY: "sk_test_secret",
    PILOT_ACCESS_CODE_HASH: accessCodeHash,
  };

  assert.deepEqual(parsePilotConfig(env), {
    enabled: true,
    allowedLocations: [
      { country: "US", region: "Washington", city: "Seattle" },
    ],
    siteUrl: "https://zhiji.example",
    stripeSecretKey: "sk_test_secret",
    accessCodeHash,
  });

  assert.throws(() =>
    parsePilotConfig({ ...env, NEXT_PUBLIC_SITE_URL: "https://zhiji.example/path" }),
  );
  assert.throws(() =>
    parsePilotConfig({ ...env, NEXT_PUBLIC_SITE_URL: "javascript:alert(1)" }),
  );
  assert.throws(() => parsePilotConfig({ ...env, NEXT_PUBLIC_SITE_URL: "" }));
  assert.throws(() => parsePilotConfig({ ...env, STRIPE_SECRET_KEY: "" }));
  assert.throws(() => parsePilotConfig({ ...env, PILOT_ACCESS_CODE_HASH: "" }));
  assert.throws(() => parsePilotConfig({ ...env, PAID_PILOT_ENABLED: "yes" }));
});

test("builds one fixed US$49 deposit product from server constants", () => {
  const params = buildDepositCheckoutParams({
    applicationId: "8913465d-06f9-47f1-b7ac-ab0945e9be42",
    email: "person@example.com",
    siteUrl: "https://zhiji.example",
  });

  assert.equal(DEPOSIT_AMOUNT_CENTS, 4900);
  assert.equal(DEPOSIT_CURRENCY, "usd");
  assert.equal(params.mode, "payment");
  assert.equal(params.customer_email, "person@example.com");
  assert.equal(params.line_items?.length, 1);
  assert.equal(params.line_items?.[0]?.quantity, 1);
  assert.equal(params.line_items?.[0]?.price_data?.currency, "usd");
  assert.equal(params.line_items?.[0]?.price_data?.unit_amount, 4900);
});

test("uses only the canonical site and non-sensitive version metadata", () => {
  const params = buildDepositCheckoutParams({
    applicationId: "8913465d-06f9-47f1-b7ac-ab0945e9be42",
    email: "private@example.com",
    siteUrl: "https://zhiji.example",
  });

  assert.equal(
    params.success_url,
    "https://zhiji.example/success?session_id={CHECKOUT_SESSION_ID}",
  );
  assert.equal(params.cancel_url, "https://zhiji.example/cancel");
  assert.deepEqual(params.metadata, {
    applicationId: "8913465d-06f9-47f1-b7ac-ab0945e9be42",
    cohortVersion: PILOT_COHORT_VERSION,
    policyVersion: "2026-07-10",
  });
  assert.equal(JSON.stringify(params.metadata).includes("private@example.com"), false);
});

test("derives stable non-PII replay identifiers from the normalized submission", () => {
  const application = eligibleApplication() as NormalizedPilotApplication;
  const fingerprint = createSubmissionFingerprint(application);

  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(createSubmissionFingerprint({ ...application }), fingerprint);
  assert.notEqual(
    createSubmissionFingerprint({ ...application, city: "Tacoma" }),
    fingerprint,
  );
  const submissionKey = "a9213a16-7d63-4ab4-8be4-f51da9e8a0a3";
  assert.equal(
    buildStripeIdempotencyKey(submissionKey),
    "pilot-checkout:a9213a16-7d63-4ab4-8be4-f51da9e8a0a3",
  );
  assert.equal(buildStripeIdempotencyKey(submissionKey).includes(application.email), false);
});

test("returns pilot_closed before reading or persisting anything", async () => {
  let created = 0;
  let checkoutCalls = 0;
  const handler = createCheckoutPostHandler({
    loadConfig: () => ({ enabled: false, allowedLocations: allowedLocation }),
    createApplication: async () => {
      created += 1;
      return { id: "app_closed", email: "person@example.com" };
    },
    transitionApplication: async () => {
      throw new Error("must not transition");
    },
    createCheckoutSession: async () => {
      checkoutCalls += 1;
      throw new Error("must not create checkout");
    },
  });

  const response = await handler({
    headers: new Headers(),
    text: async () => {
      throw new Error("closed pilot must not read the body");
    },
  } as unknown as Request);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "pilot_closed" });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("retry-after"), "86400");
  assert.equal(created, 0);
  assert.equal(checkoutCalls, 0);
});

test("denies missing access code and invalid idempotency before reading body", async () => {
  let reads = 0;
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async () => {
      throw new Error("must not persist");
    },
    transitionApplication: async () => undefined,
    createCheckoutSession: async () => ({ id: "cs_no", url: "https://no", status: "open" }),
  });
  const makeRequest = (headers: Record<string, string>) =>
    ({
      headers: new Headers(headers),
      text: async () => {
        reads += 1;
        throw new Error("must not read");
      },
    }) as unknown as Request;

  const denied = await handler(makeRequest({ "idempotency-key": randomUUID() }));
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { status: "access_denied" });

  const badKey = await handler(
    makeRequest({
      "x-pilot-access-code": accessCode,
      "idempotency-key": "not-a-uuid",
    }),
  );
  assert.equal(badKey.status, 422);
  assert.deepEqual(await badKey.json(), {
    status: "validation_failed",
    reason: "invalid_field",
    field: "idempotencyKey",
  });
  assert.equal(reads, 0);
});

test("requires JSON and rejects an actual UTF-8 body over 16 KiB", async () => {
  let writes = 0;
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async () => {
      writes += 1;
      return { id: "must_not_write", email: "person@example.com" };
    },
    transitionApplication: async () => undefined,
    createCheckoutSession: async () => ({ id: "cs_no", url: "https://no", status: "open" }),
  });

  const wrongType = await handler(
    checkoutRequest(eligibleApplication(), undefined, {
      "content-type": "text/plain",
    }),
  );
  assert.equal(wrongType.status, 415);

  const oversized = await handler(
    checkoutRequest({ ...eligibleApplication(), padding: "界".repeat(6_000) }),
  );
  assert.equal(oversized.status, 413);
  assert.equal(writes, 0);
});

test("cancels a streamed checkout body over 16 KiB despite a false length", async () => {
  let writes = 0;
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async () => {
      writes += 1;
      return { id: "must_not_write", email: "person@example.com" };
    },
    transitionApplication: async () => undefined,
    createCheckoutSession: async () => ({
      id: "cs_no",
      url: "https://no",
      status: "open",
    }),
  });
  const incoming = streamingCheckoutRequest(
    [new Uint8Array(16 * 1024), new Uint8Array([1])],
    "1",
  );

  const response = await handler(incoming.request);

  assert.equal(response.status, 413);
  assert.equal(incoming.wasCanceled(), true);
  assert.equal(writes, 0);
});

test("rejects client-controlled amount and tier before persistence", async () => {
  let writes = 0;
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async () => {
      writes += 1;
      return { id: "must_not_write", email: "person@example.com" };
    },
    transitionApplication: async () => undefined,
    createCheckoutSession: async () => ({ id: "cs_no", url: "https://no", status: "open" }),
  });

  for (const forbidden of [
    { amount: 1 },
    { tierId: "cheap" },
    { tier: "premium" },
  ]) {
    const response = await handler(
      checkoutRequest({ ...eligibleApplication(), ...forbidden }),
    );
    assert.equal(response.status, 422);
    const payload = await response.json();
    assert.equal(payload.status, "validation_failed");
    assert.equal(payload.reason, "forbidden_field");
    assert.equal(JSON.stringify(payload).includes("cheap"), false);
  }
  assert.equal(writes, 0);
});

test("persists ordinary declines and gives acute crisis safety precedence", async () => {
  const decisions: Array<{ status: string; reasons: readonly string[] }> = [];
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async (
      application: NormalizedPilotApplication,
      decision,
    ) => {
      assert.equal(application.email, "person@example.com");
      decisions.push(decision);
      return { id: `app_${decisions.length}`, email: application.email };
    },
    transitionApplication: async () => undefined,
    createCheckoutSession: async () => ({ id: "cs_no", url: "https://no", status: "open" }),
  });

  const declined = await handler(
    checkoutRequest({ ...eligibleApplication(), ageConfirmed: false }),
  );
  assert.equal(declined.status, 200);
  assert.deepEqual(await declined.json(), {
    status: "declined",
    reasons: ["minor_or_age_unconfirmed"],
  });

  const safety = await handler(
    checkoutRequest({
      ...eligibleApplication(),
      ageConfirmed: false,
      acuteCrisis: true,
    }),
  );
  assert.equal(safety.status, 200);
  assert.deepEqual(await safety.json(), {
    status: "declined",
    reasons: ["minor_or_age_unconfirmed", "acute_crisis"],
  });
  assert.deepEqual(decisions, [
    { status: "declined", reasons: ["minor_or_age_unconfirmed"] },
    {
      status: "safety_refused",
      reasons: ["minor_or_age_unconfirmed", "acute_crisis"],
    },
  ]);
});

test("creates checkout from configured origin and transitions once", async () => {
  const checkoutInputs: unknown[] = [];
  const transitions: unknown[] = [];
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async () => ({
      id: "8913465d-06f9-47f1-b7ac-ab0945e9be42",
      email: "person@example.com",
    }),
    transitionApplication: async (id, transition) => {
      transitions.push({ id, transition });
    },
    createCheckoutSession: async (secret, input) => {
      assert.equal(secret, "sk_test_secret");
      checkoutInputs.push(input);
      return { id: "cs_test_123", url: "https://checkout.stripe.com/test", status: "open" };
    },
  });

  const response = await handler(
    checkoutRequest(eligibleApplication(), "https://attacker.example"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "checkout_created",
    applicationId: "8913465d-06f9-47f1-b7ac-ab0945e9be42",
    checkoutUrl: "https://checkout.stripe.com/test",
  });
  assert.deepEqual(checkoutInputs, [
    {
      applicationId: "8913465d-06f9-47f1-b7ac-ab0945e9be42",
      email: "person@example.com",
      siteUrl: "https://zhiji.example",
    },
  ]);
  assert.deepEqual(transitions, [
    {
      id: "8913465d-06f9-47f1-b7ac-ab0945e9be42",
      transition: {
        to: "checkout_created",
        actor: "system",
        reason: "checkout_session_created",
        metadata: { cohort: PILOT_COHORT_VERSION },
        stripeCheckoutSessionId: "cs_test_123",
      },
    },
  ]);
});

test("reuses an existing checkout for an identical submission retry", async () => {
  const submissionKey = "a9213a16-7d63-4ab4-8be4-f51da9e8a0a3";
  let stored:
    | {
        id: string;
        email: string;
        status: "qualified" | "checkout_created";
        stripeCheckoutSessionId: string | null;
      }
    | undefined;
  let creates = 0;
  let retrieves = 0;
  let persistedFingerprint = "";
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async (application, _decision, replay) => {
      assert.equal(replay.submissionKey, submissionKey);
      if (!stored) {
        persistedFingerprint = replay.submissionFingerprint;
        stored = {
          id: "app_replay",
          email: application.email,
          status: "qualified",
          stripeCheckoutSessionId: null,
        };
      } else {
        assert.equal(replay.submissionFingerprint, persistedFingerprint);
      }
      return stored;
    },
    transitionApplication: async (_id, transition) => {
      assert.equal(transition.stripeCheckoutSessionId, "cs_replay");
      stored = { ...stored!, status: "checkout_created", stripeCheckoutSessionId: "cs_replay" };
    },
    createCheckoutSession: async (_secret, _input, idempotencyKey) => {
      creates += 1;
      assert.equal(idempotencyKey, buildStripeIdempotencyKey(submissionKey));
      return { id: "cs_replay", url: "https://checkout.stripe.com/replay", status: "open" };
    },
    retrieveCheckoutSession: async (_secret, sessionId) => {
      retrieves += 1;
      assert.equal(sessionId, "cs_replay");
      return { id: "cs_replay", url: "https://checkout.stripe.com/replay", status: "open" };
    },
  });
  const makeRequest = () =>
    checkoutRequest(eligibleApplication(), undefined, {
      "idempotency-key": submissionKey,
    });

  const first = await handler(makeRequest());
  const second = await handler(makeRequest());

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(creates, 1);
  assert.equal(retrieves, 1);
  assert.deepEqual(await second.json(), {
    status: "checkout_created",
    applicationId: "app_replay",
    checkoutUrl: "https://checkout.stripe.com/replay",
  });
});

test("rejects a reused submission key bound to different content", async () => {
  let checkoutCalls = 0;
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async () => {
      throw new SubmissionConflictError();
    },
    transitionApplication: async () => undefined,
    createCheckoutSession: async () => {
      checkoutCalls += 1;
      return { id: "cs_no", url: "https://no", status: "open" };
    },
  });

  const response = await handler(checkoutRequest(eligibleApplication()));

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    status: "validation_failed",
    reason: "invalid_field",
    field: "idempotencyKey",
  });
  assert.equal(checkoutCalls, 0);
});

test("returns a safe retryable error without expiring on transition failure", async () => {
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async () => ({
      id: "app_orphan",
      email: "person@example.com",
      status: "qualified",
      stripeCheckoutSessionId: null,
    }),
    transitionApplication: async () => {
      throw new Error("database unavailable");
    },
    createCheckoutSession: async () => ({
      id: "cs_orphan",
      url: "https://checkout.stripe.com/orphan",
      status: "open",
    }),
    retrieveCheckoutSession: async () => {
      throw new Error("must not retrieve");
    },
    logger: () => undefined,
  });

  const response = await handler(checkoutRequest(eligibleApplication()));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "checkout_unavailable" });
});

test("always returns 503 when the transition call rejects", async () => {
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async () => ({
      id: "app_ambiguous",
      email: "person@example.com",
      status: "qualified",
      stripeCheckoutSessionId: null,
    }),
    transitionApplication: async () => {
      throw new Error("connection dropped after commit");
    },
    createCheckoutSession: async () => ({
      id: "cs_ambiguous",
      url: "https://checkout.stripe.com/ambiguous",
      status: "open",
    }),
    logger: () => undefined,
  });

  const response = await handler(checkoutRequest(eligibleApplication()));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "checkout_unavailable" });
});

test("does not return an expired checkout session on replay", async () => {
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async () => ({
      id: "app_expired",
      email: "person@example.com",
      status: "checkout_created",
      stripeCheckoutSessionId: "cs_expired",
    }),
    transitionApplication: async () => undefined,
    createCheckoutSession: async () => {
      throw new Error("must not create");
    },
    retrieveCheckoutSession: async () => ({
      id: "cs_expired",
      url: "https://checkout.stripe.com/expired",
      status: "expired",
    }),
  });

  const response = await handler(checkoutRequest(eligibleApplication()));

  assert.equal(response.status, 410);
  assert.deepEqual(await response.json(), { status: "checkout_expired" });
});

test("does not persist or return a newly completed checkout session", async () => {
  let transitions = 0;
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async () => ({
      id: "app_complete",
      email: "person@example.com",
      status: "qualified",
      stripeCheckoutSessionId: null,
    }),
    transitionApplication: async () => {
      transitions += 1;
    },
    createCheckoutSession: async () => ({
      id: "cs_complete",
      url: "https://checkout.stripe.com/complete",
      status: "complete",
    }),
  });

  const response = await handler(checkoutRequest(eligibleApplication()));

  assert.equal(response.status, 410);
  assert.deepEqual(await response.json(), { status: "checkout_expired" });
  assert.equal(transitions, 0);
});

test("turns checkout failures into a PII-free unavailable response", async () => {
  const logs: unknown[] = [];
  const handler = createCheckoutPostHandler({
    loadConfig: () => enabledConfig,
    createApplication: async () => ({
      id: "app_checkout_failure",
      email: "private@example.com",
    }),
    transitionApplication: async () => undefined,
    createCheckoutSession: async () => {
      throw new Error("processor failed for private@example.com");
    },
    createCorrelationId: () => "corr-checkout-1",
    logger: (entry) => logs.push(entry),
  });

  const response = await handler(checkoutRequest(eligibleApplication()));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("x-request-id"), "corr-checkout-1");
  assert.deepEqual(await response.json(), { status: "checkout_unavailable" });
  assert.deepEqual(logs, [
    { correlationId: "corr-checkout-1", code: "stripe_checkout_create_failed" },
  ]);
  assert.equal(JSON.stringify(logs).includes("private@example.com"), false);
});

test("keeps notification transport out of the production checkout request", async () => {
  const route = await readFile(
    new URL("../app/api/checkout/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(route, /deliverNotification|loadNotificationConfig|sendResendEmail/);
});

test("status lookup is read-only and maps only payment lifecycle states", async () => {
  const states = new Map([
    ["cs_pending", { id: "app_pending", status: "checkout_created" as const }],
    ["cs_paid", { id: "app_paid", status: "deposit_paid" as const }],
    ["cs_refunded", { id: "app_refunded", status: "deposit_refunded" as const }],
    ["cs_qualified", { id: "app_qualified", status: "qualified" as const }],
  ]);
  let reads = 0;
  const handler = createCheckoutStatusHandler({
    getApplicationByCheckoutSession: async (sessionId) => {
      reads += 1;
      return states.get(sessionId) ?? null;
    },
  });

  const cases = [
    ["cs_pending", 200, { status: "payment_pending" }],
    ["cs_paid", 200, { status: "paid" }],
    ["cs_refunded", 200, { status: "refunded" }],
    ["cs_qualified", 404, { status: "not_found" }],
    ["cs_unknown", 404, { status: "not_found" }],
  ] as const;

  for (const [sessionId, status, body] of cases) {
    const response = await handler(
      new Request(
        `https://zhiji.example/api/checkout/status?session_id=${sessionId}`,
      ),
    );
    assert.equal(response.status, status);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), body);
  }
  assert.equal(reads, cases.length);
});

test("distinguishes status infrastructure failure with safe correlation logging", async () => {
  const logs: unknown[] = [];
  const handler = createCheckoutStatusHandler({
    getApplicationByCheckoutSession: async () => {
      throw new Error("database failed for cs_private_secret");
    },
    createCorrelationId: () => "corr-status-1",
    logger: (entry) => logs.push(entry),
  });

  const response = await handler(
    new Request("https://zhiji.example/api/checkout/status?session_id=cs_private_secret"),
  );

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-request-id"), "corr-status-1");
  assert.deepEqual(await response.json(), { status: "status_unavailable" });
  assert.deepEqual(logs, [
    { correlationId: "corr-status-1", code: "checkout_status_lookup_failed" },
  ]);
  assert.equal(JSON.stringify(logs).includes("cs_private_secret"), false);
});

test("retires the free endpoint without reading or persisting its body", async () => {
  const request = {
    json: async () => {
      throw new Error("the retired endpoint must not read input");
    },
  } as unknown as Request;

  const response = await retireFreeApplication(request);

  assert.equal(response.status, 410);
  assert.deepEqual(await response.json(), { status: "retired" });
});
