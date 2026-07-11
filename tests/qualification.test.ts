import assert from "node:assert/strict";
import test from "node:test";

import {
  DEPOSIT_POLICY_VERSION,
  PILOT_CONSENT_VERSION,
  PILOT_CORE_PRICE_USD,
  PRIVACY_NOTICE_VERSION,
  SOFTWARE_DISCLOSURE_VERSION,
  TERMS_VERSION,
  type PilotApplicationRequest,
  type PilotCheckoutResponse,
  type PilotCheckoutStatusResponse,
  type PilotLocationPolicy,
  type PilotQualificationResult,
} from "../lib/contracts/pilot";
import {
  evaluatePilotApplication,
  parsePilotApplication,
} from "../lib/server/qualification";

test("locks the acknowledged pilot core price to US$388", () => {
  assert.equal(PILOT_CORE_PRICE_USD, 388);
});

const sanFranciscoPolicy: PilotLocationPolicy = [
  { country: "US", region: "California", city: "San Francisco" },
];
const torontoPolicy: PilotLocationPolicy = [
  { country: "CA", region: "Ontario", city: "Toronto" },
];

const eligibleApplication = (): PilotApplicationRequest => ({
  lang: "zh",
  email: "person@example.com",
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
  attribution: {
    source: "google",
    campaign: "pilot-2026",
    referrer: "https://example.com/article",
    friendGraph: "organic",
  },
  pilotConsentVersion: PILOT_CONSENT_VERSION,
  privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
  termsVersion: TERMS_VERSION,
  depositPolicyVersion: DEPOSIT_POLICY_VERSION,
  softwareDisclosureVersion: SOFTWARE_DISCLOSURE_VERSION,
});

const assertDeclined = (
  result: PilotQualificationResult,
  reasons: string[],
): void => {
  assert.equal(result.status, "declined");
  if (result.status === "declined") {
    assert.deepEqual(result.reasons, reasons);
    assert.equal(result.application.email, "person@example.com");
  }
};

test("accepts and normalizes an eligible application", () => {
  const input = eligibleApplication();
  input.email = "  Person@Example.COM ";

  const result = evaluatePilotApplication(input, sanFranciscoPolicy);

  assert.deepEqual(result, {
    status: "qualified",
    application: { ...input, email: "person@example.com" },
  });
});

test("rejects every forbidden field without reflecting its value", () => {
  for (const field of [
    "birth",
    "birthDate",
    "birthTime",
    "birthLocation",
    "birthCity",
    "question",
    "amount",
    "tier",
    "tierId",
    "payment",
    "paymentMethod",
    "paymentStatus",
  ]) {
    const secret = "do-not-reflect-this";
    const result = parsePilotApplication({
      ...eligibleApplication(),
      [field]: secret,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "forbidden_field");
      assert.equal(result.field, field);
      assert.equal(JSON.stringify(result).includes(secret), false);
    }
  }

  const unknown = parsePilotApplication({
    ...eligibleApplication(),
    unexpected: "do-not-reflect-this",
  });
  assert.deepEqual(unknown, {
    ok: false,
    reason: "unknown_field",
    field: "$unknown",
  });
});

test("never reflects attacker-controlled unknown field names", () => {
  const malicious = '"><script>alert("field")</script>';
  assert.deepEqual(
    parsePilotApplication({ ...eligibleApplication(), [malicious]: "secret" }),
    { ok: false, reason: "unknown_field", field: "$unknown" },
  );
  assert.deepEqual(
    parsePilotApplication({
      ...eligibleApplication(),
      attribution: {
        friendGraph: "organic",
        [malicious]: "secret",
      },
    }),
    { ok: false, reason: "unknown_field", field: "attribution.$unknown" },
  );

  assert.deepEqual(
    parsePilotApplication({ ...eligibleApplication(), "": "secret" }),
    { ok: false, reason: "unknown_field", field: "$unknown" },
  );
  assert.deepEqual(
    parsePilotApplication({
      ...eligibleApplication(),
      attribution: { friendGraph: "organic", "": "secret" },
    }),
    { ok: false, reason: "unknown_field", field: "attribution.$unknown" },
  );
});

test("accepts only bounded attribution with a valid friend-graph class", () => {
  assert.deepEqual(
    parsePilotApplication({
      ...eligibleApplication(),
      attribution: {
        source: "community",
        medium: "wechat",
        campaign: "founding-pilot",
        referrer: "https://example.com",
        friendGraph: "client_referral",
      },
    }).ok,
    true,
  );

  assert.deepEqual(
    parsePilotApplication({
      ...eligibleApplication(),
      attribution: {
        source: "community",
        friendGraph: "organic",
        content: "not-supported",
      },
    }),
    { ok: false, reason: "unknown_field", field: "attribution.$unknown" },
  );

  assert.deepEqual(
    parsePilotApplication({
      ...eligibleApplication(),
      attribution: { source: "community", friendGraph: "friends-ish" },
    }),
    { ok: false, reason: "invalid_field", field: "attribution.friendGraph" },
  );

  assert.deepEqual(
    parsePilotApplication({
      ...eligibleApplication(),
      attribution: { source: "community" },
    }),
    { ok: false, reason: "missing_field", field: "attribution.friendGraph" },
  );
});

test("rejects malformed, missing, and stale-version input", () => {
  const malformed = parsePilotApplication({
    ...eligibleApplication(),
    email: "not-an-email",
  });
  assert.deepEqual(malformed, {
    ok: false,
    reason: "invalid_field",
    field: "email",
  });

  const missing = eligibleApplication() as unknown as Record<string, unknown>;
  delete missing.scopeAccepted;
  assert.deepEqual(parsePilotApplication(missing), {
    ok: false,
    reason: "missing_field",
    field: "scopeAccepted",
  });

  assert.deepEqual(
    parsePilotApplication({
      ...eligibleApplication(),
      termsVersion: "old-version",
    }),
    { ok: false, reason: "invalid_field", field: "termsVersion" },
  );
});

test("bounds attribution and profile text", () => {
  assert.deepEqual(
    parsePilotApplication({
      ...eligibleApplication(),
      attribution: { source: "x".repeat(81), friendGraph: "unknown" },
    }),
    { ok: false, reason: "invalid_field", field: "attribution.source" },
  );

  assert.deepEqual(
    parsePilotApplication({ ...eligibleApplication(), city: "x".repeat(121) }),
    { ok: false, reason: "invalid_field", field: "city" },
  );
});

test("declines ineligible geography and timing", () => {
  const cases: Array<[Partial<PilotApplicationRequest>, string]> = [
    [{ country: "OTHER" }, "unsupported_country"],
    [{ decisionWindow: "later" }, "decision_not_within_90_days"],
    [{ decisionWindow: "unsure" }, "decision_not_within_90_days"],
  ];

  for (const [change, reason] of cases) {
    assertDeclined(
      evaluatePilotApplication(
        { ...eligibleApplication(), ...change },
        sanFranciscoPolicy,
      ),
      [reason],
    );
  }
});

test("defaults every US and Canada location to declined until explicitly allowed", () => {
  assertDeclined(evaluatePilotApplication(eligibleApplication()), [
    "location_not_enabled",
  ]);
  assertDeclined(evaluatePilotApplication(eligibleApplication(), []), [
    "location_not_enabled",
  ]);
  assertDeclined(
    evaluatePilotApplication(
      { ...eligibleApplication(), city: "Los Angeles" },
      sanFranciscoPolicy,
    ),
    ["location_not_enabled"],
  );

  const losAngelesPolicy: PilotLocationPolicy = [
    { country: "US", region: "California", city: "Los Angeles" },
  ];
  assert.equal(
    evaluatePilotApplication(
      { ...eligibleApplication(), city: "Los Angeles" },
      losAngelesPolicy,
    ).status,
    "qualified",
  );
});

test("qualifies an otherwise eligible Canadian application", () => {
  const result = evaluatePilotApplication(
    {
      ...eligibleApplication(),
      country: "CA",
      region: "Ontario",
      city: "Toronto",
    },
    torontoPolicy,
  );

  assert.equal(result.status, "qualified");
});

test("rejects the unsupported immigration-adjacent decision type", () => {
  assert.deepEqual(
    parsePilotApplication({
      ...eligibleApplication(),
      decisionType: "immigration_adjacent",
    }),
    { ok: false, reason: "invalid_field", field: "decisionType" },
  );
});

test("declines minors, price mismatch, safety risks, and third-party data", () => {
  const cases: Array<[keyof PilotApplicationRequest, boolean, string]> = [
    ["ageConfirmed", false, "minor_or_age_unconfirmed"],
    ["priceAcknowledged", false, "price_not_acknowledged"],
    ["acuteCrisis", true, "acute_crisis"],
    ["restrictedAdvice", true, "restricted_advice"],
    ["selfOnlyDataConfirmed", false, "third_party_or_minor_data"],
  ];

  for (const [field, value, reason] of cases) {
    assertDeclined(
      evaluatePilotApplication(
        { ...eligibleApplication(), [field]: value },
        sanFranciscoPolicy,
      ),
      [reason],
    );
  }
});

test("declines every missing required acknowledgement", () => {
  const acknowledgements: Array<keyof PilotApplicationRequest> = [
    "frameworkAccepted",
    "agencyAccepted",
    "scopeAccepted",
    "softwareDisclosureAcknowledged",
    "privacyConsent",
    "termsAccepted",
    "depositPolicyAccepted",
  ];

  for (const field of acknowledgements) {
    assertDeclined(
      evaluatePilotApplication(
        { ...eligibleApplication(), [field]: false },
        sanFranciscoPolicy,
      ),
      ["required_acknowledgement_missing"],
    );
  }
});

test("returns every applicable decline reason in stable order", () => {
  const result = evaluatePilotApplication(
    {
      ...eligibleApplication(),
      ageConfirmed: false,
      country: "OTHER",
      decisionWindow: "unsure",
      priceAcknowledged: false,
      acuteCrisis: true,
      restrictedAdvice: true,
      selfOnlyDataConfirmed: false,
      scopeAccepted: false,
    },
    sanFranciscoPolicy,
  );

  assertDeclined(result, [
      "minor_or_age_unconfirmed",
      "unsupported_country",
      "decision_not_within_90_days",
      "price_not_acknowledged",
      "required_acknowledgement_missing",
      "acute_crisis",
      "restricted_advice",
      "third_party_or_minor_data",
  ]);
});

test("keeps route-facing checkout responses PII-free", () => {
  const checkoutResponses: PilotCheckoutResponse[] = [
    { status: "validation_failed", reason: "unknown_field", field: "$unknown" },
    { status: "declined", reasons: ["location_not_enabled"] },
    { status: "access_denied" },
    { status: "pilot_closed" },
    { status: "checkout_unavailable" },
    { status: "checkout_expired" },
    {
      status: "checkout_created",
      applicationId: "app_123",
      checkoutUrl: "https://checkout.stripe.com/example",
    },
  ];
  const statusResponses: PilotCheckoutStatusResponse[] = [
    { status: "not_found" },
    { status: "status_unavailable" },
    { status: "payment_pending" },
    { status: "paid" },
    { status: "refunded" },
  ];

  for (const response of [...checkoutResponses, ...statusResponses]) {
    const serialized = JSON.stringify(response);
    for (const piiKey of ["application", "email", "country", "region", "city"]) {
      assert.equal(serialized.includes(`"${piiKey}"`), false);
    }
  }
});
