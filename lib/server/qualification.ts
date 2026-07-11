import {
  DEPOSIT_POLICY_VERSION,
  PILOT_CONSENT_VERSION,
  PILOT_COUNTRIES,
  PILOT_DECISION_TYPES,
  PILOT_DECISION_WINDOWS,
  PILOT_FRIEND_GRAPH_CLASSES,
  PILOT_LANGUAGES,
  PRIVACY_NOTICE_VERSION,
  SOFTWARE_DISCLOSURE_VERSION,
  TERMS_VERSION,
  type PilotApplicationRequest,
  type PilotAttribution,
  type PilotDeclineReason,
  type PilotLocationPolicy,
  type PilotQualificationResult,
  type PilotValidationResult,
} from "../contracts/pilot";

const requiredFields: Array<keyof PilotApplicationRequest> = [
  "lang",
  "email",
  "country",
  "region",
  "city",
  "decisionType",
  "decisionWindow",
  "ageConfirmed",
  "priceAcknowledged",
  "frameworkAccepted",
  "agencyAccepted",
  "scopeAccepted",
  "softwareDisclosureAcknowledged",
  "privacyConsent",
  "termsAccepted",
  "depositPolicyAccepted",
  "selfOnlyDataConfirmed",
  "acuteCrisis",
  "restrictedAdvice",
  "pilotConsentVersion",
  "privacyNoticeVersion",
  "termsVersion",
  "depositPolicyVersion",
  "softwareDisclosureVersion",
];

const optionalFields: Array<keyof PilotApplicationRequest> = [
  "marketingConsent",
  "attribution",
];
const allowedFields = new Set<string>([...requiredFields, ...optionalFields]);
const forbiddenFields = new Set([
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
]);
const booleanFields: Array<keyof PilotApplicationRequest> = [
  "ageConfirmed",
  "priceAcknowledged",
  "frameworkAccepted",
  "agencyAccepted",
  "scopeAccepted",
  "softwareDisclosureAcknowledged",
  "privacyConsent",
  "termsAccepted",
  "depositPolicyAccepted",
  "selfOnlyDataConfirmed",
  "acuteCrisis",
  "restrictedAdvice",
];
const attributionFields: Array<keyof PilotAttribution> = [
  "source",
  "medium",
  "campaign",
  "referrer",
  "friendGraph",
];

const failure = (
  reason: Exclude<PilotValidationResult, { ok: true }>["reason"],
  field: string,
): PilotValidationResult => ({ ok: false, reason, field });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T => typeof value === "string" && allowed.includes(value as T);

const boundedString = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;

const parseAttribution = (
  value: unknown,
):
  | { ok: true; value: PilotAttribution }
  | {
      ok: false;
      reason: "unknown_field" | "missing_field" | "invalid_field";
      field: string;
    } => {
  if (!isRecord(value)) {
    return { ok: false, reason: "invalid_field", field: "attribution" };
  }

  const unknown = Object.keys(value).find(
    (field) => !attributionFields.includes(field as keyof PilotAttribution),
  );
  if (unknown !== undefined) {
    return {
      ok: false,
      reason: "unknown_field",
      field: "attribution.$unknown",
    };
  }
  if (value.friendGraph === undefined) {
    return {
      ok: false,
      reason: "missing_field",
      field: "attribution.friendGraph",
    };
  }
  if (!isOneOf(value.friendGraph, PILOT_FRIEND_GRAPH_CLASSES)) {
    return {
      ok: false,
      reason: "invalid_field",
      field: "attribution.friendGraph",
    };
  }

  const parsed: PilotAttribution = { friendGraph: value.friendGraph };
  for (const field of ["source", "medium", "campaign", "referrer"] as const) {
    const candidate = value[field];
    if (candidate === undefined) continue;
    const max = field === "referrer" ? 500 : 80;
    if (!boundedString(candidate, max)) {
      return {
        ok: false,
        reason: "invalid_field",
        field: `attribution.${field}`,
      };
    }
    parsed[field] = candidate.trim();
  }
  return { ok: true, value: parsed };
};

export function parsePilotApplication(input: unknown): PilotValidationResult {
  if (!isRecord(input)) return failure("invalid_field", "$root");

  const extraField = Object.keys(input).find((field) => !allowedFields.has(field));
  if (extraField !== undefined) {
    return failure(
      forbiddenFields.has(extraField) ? "forbidden_field" : "unknown_field",
      forbiddenFields.has(extraField) ? extraField : "$unknown",
    );
  }

  const missingField = requiredFields.find((field) => input[field] === undefined);
  if (missingField) return failure("missing_field", missingField);

  if (!isOneOf(input.lang, PILOT_LANGUAGES)) return failure("invalid_field", "lang");
  if (
    !boundedString(input.email, 254) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
  ) {
    return failure("invalid_field", "email");
  }
  if (!isOneOf(input.country, PILOT_COUNTRIES)) {
    return failure("invalid_field", "country");
  }
  if (!boundedString(input.region, 120)) return failure("invalid_field", "region");
  if (!boundedString(input.city, 120)) return failure("invalid_field", "city");
  if (!isOneOf(input.decisionType, PILOT_DECISION_TYPES)) {
    return failure("invalid_field", "decisionType");
  }
  if (!isOneOf(input.decisionWindow, PILOT_DECISION_WINDOWS)) {
    return failure("invalid_field", "decisionWindow");
  }
  for (const field of booleanFields) {
    if (typeof input[field] !== "boolean") return failure("invalid_field", field);
  }
  if (input.marketingConsent !== undefined && typeof input.marketingConsent !== "boolean") {
    return failure("invalid_field", "marketingConsent");
  }

  const expectedVersions = {
    pilotConsentVersion: PILOT_CONSENT_VERSION,
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
    termsVersion: TERMS_VERSION,
    depositPolicyVersion: DEPOSIT_POLICY_VERSION,
    softwareDisclosureVersion: SOFTWARE_DISCLOSURE_VERSION,
  } as const;
  for (const [field, version] of Object.entries(expectedVersions)) {
    if (input[field] !== version) return failure("invalid_field", field);
  }

  let attribution: PilotAttribution | undefined;
  if (input.attribution !== undefined) {
    const parsed = parseAttribution(input.attribution);
    if (!parsed.ok) return failure(parsed.reason, parsed.field);
    attribution = parsed.value;
  }

  // Every property is validated above; this only teaches TypeScript what the
  // runtime checks have established.
  const validated = input as unknown as PilotApplicationRequest;

  return {
    ok: true,
    application: {
      lang: validated.lang,
      email: validated.email.trim().toLowerCase(),
      country: validated.country,
      region: validated.region.trim(),
      city: validated.city.trim(),
      decisionType: validated.decisionType,
      decisionWindow: validated.decisionWindow,
      ageConfirmed: validated.ageConfirmed,
      priceAcknowledged: validated.priceAcknowledged,
      frameworkAccepted: validated.frameworkAccepted,
      agencyAccepted: validated.agencyAccepted,
      scopeAccepted: validated.scopeAccepted,
      softwareDisclosureAcknowledged: validated.softwareDisclosureAcknowledged,
      privacyConsent: validated.privacyConsent,
      termsAccepted: validated.termsAccepted,
      depositPolicyAccepted: validated.depositPolicyAccepted,
      selfOnlyDataConfirmed: validated.selfOnlyDataConfirmed,
      acuteCrisis: validated.acuteCrisis,
      restrictedAdvice: validated.restrictedAdvice,
      ...(input.marketingConsent === undefined
        ? {}
        : { marketingConsent: input.marketingConsent }),
      ...(attribution === undefined ? {} : { attribution }),
      pilotConsentVersion: PILOT_CONSENT_VERSION,
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      termsVersion: TERMS_VERSION,
      depositPolicyVersion: DEPOSIT_POLICY_VERSION,
      softwareDisclosureVersion: SOFTWARE_DISCLOSURE_VERSION,
    },
  };
}

const locationAllowed = (
  application: PilotApplicationRequest,
  policy: PilotLocationPolicy,
): boolean =>
  policy.some(
    (location) =>
      location.country === application.country &&
      location.region.trim().toLowerCase() === application.region.trim().toLowerCase() &&
      location.city.trim().toLowerCase() === application.city.trim().toLowerCase(),
  );

export function evaluatePilotApplication(
  input: unknown,
  locationPolicy: PilotLocationPolicy = [],
): PilotQualificationResult {
  const parsed = parsePilotApplication(input);
  if (!parsed.ok) {
    return { status: "invalid", reason: parsed.reason, field: parsed.field };
  }

  const application = parsed.application;
  const reasons: PilotDeclineReason[] = [];
  if (!application.ageConfirmed) reasons.push("minor_or_age_unconfirmed");
  if (application.country === "OTHER") reasons.push("unsupported_country");
  if (
    application.country !== "OTHER" &&
    !locationAllowed(application, locationPolicy)
  ) {
    reasons.push("location_not_enabled");
  }
  if (["later", "unsure"].includes(application.decisionWindow)) {
    reasons.push("decision_not_within_90_days");
  }
  if (!application.priceAcknowledged) reasons.push("price_not_acknowledged");
  if (
    !application.frameworkAccepted ||
    !application.agencyAccepted ||
    !application.scopeAccepted ||
    !application.softwareDisclosureAcknowledged ||
    !application.privacyConsent ||
    !application.termsAccepted ||
    !application.depositPolicyAccepted
  ) {
    reasons.push("required_acknowledgement_missing");
  }
  if (application.acuteCrisis) reasons.push("acute_crisis");
  if (application.restrictedAdvice) reasons.push("restricted_advice");
  if (!application.selfOnlyDataConfirmed) reasons.push("third_party_or_minor_data");

  return reasons.length > 0
    ? { status: "declined", reasons, application }
    : { status: "qualified", application };
}
