export const PILOT_CONSENT_VERSION = "2026-07-10";
export const PRIVACY_NOTICE_VERSION = "2026-07-10";
export const TERMS_VERSION = "2026-07-10";
export const DEPOSIT_POLICY_VERSION = "2026-07-10";
export const SOFTWARE_DISCLOSURE_VERSION = "2026-07-10";
export const PILOT_COHORT_VERSION = "founding-2026-07";
export const PILOT_CORE_PRICE_USD = 388;

export const PILOT_LANGUAGES = ["zh", "en"] as const;
export const PILOT_COUNTRIES = ["US", "CA", "OTHER"] as const;
export const PILOT_DECISION_TYPES = [
  "career",
  "relocation",
  "founder",
  "relationship",
  "family",
  "other",
] as const;
export const PILOT_FRIEND_GRAPH_CLASSES = [
  "direct_friend",
  "client_referral",
  "community",
  "organic",
  "paid",
  "unknown",
] as const;
export const PILOT_DECISION_WINDOWS = [
  "within_30_days",
  "within_90_days",
  "later",
  "unsure",
] as const;

export type PilotLanguage = (typeof PILOT_LANGUAGES)[number];
export type PilotCountry = (typeof PILOT_COUNTRIES)[number];
export type PilotDecisionType = (typeof PILOT_DECISION_TYPES)[number];
export type PilotDecisionWindow = (typeof PILOT_DECISION_WINDOWS)[number];
export type PilotFriendGraphClass = (typeof PILOT_FRIEND_GRAPH_CLASSES)[number];

export interface PilotAttribution {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  friendGraph: PilotFriendGraphClass;
}

export interface PilotApplicationRequest {
  lang: PilotLanguage;
  email: string;
  country: PilotCountry;
  region: string;
  city: string;
  decisionType: PilotDecisionType;
  decisionWindow: PilotDecisionWindow;
  ageConfirmed: boolean;
  priceAcknowledged: boolean;
  frameworkAccepted: boolean;
  agencyAccepted: boolean;
  scopeAccepted: boolean;
  softwareDisclosureAcknowledged: boolean;
  privacyConsent: boolean;
  termsAccepted: boolean;
  depositPolicyAccepted: boolean;
  selfOnlyDataConfirmed: boolean;
  acuteCrisis: boolean;
  restrictedAdvice: boolean;
  marketingConsent?: boolean;
  attribution?: PilotAttribution;
  pilotConsentVersion: typeof PILOT_CONSENT_VERSION;
  privacyNoticeVersion: typeof PRIVACY_NOTICE_VERSION;
  termsVersion: typeof TERMS_VERSION;
  depositPolicyVersion: typeof DEPOSIT_POLICY_VERSION;
  softwareDisclosureVersion: typeof SOFTWARE_DISCLOSURE_VERSION;
}

export interface NormalizedPilotApplication extends PilotApplicationRequest {
  email: string;
  region: string;
  city: string;
  attribution?: PilotAttribution;
}

export interface PilotAllowedLocation {
  country: "US" | "CA";
  region: string;
  city: string;
}

export type PilotLocationPolicy = readonly PilotAllowedLocation[];

export type PilotValidationReason =
  | "forbidden_field"
  | "unknown_field"
  | "missing_field"
  | "invalid_field";

export type PilotValidationResult =
  | { ok: true; application: NormalizedPilotApplication }
  | {
      ok: false;
      reason: PilotValidationReason;
      field: string;
    };

export type PilotDeclineReason =
  | "minor_or_age_unconfirmed"
  | "unsupported_country"
  | "location_not_enabled"
  | "decision_not_within_90_days"
  | "price_not_acknowledged"
  | "required_acknowledgement_missing"
  | "acute_crisis"
  | "restricted_advice"
  | "third_party_or_minor_data";

export type PilotQualificationResult =
  | { status: "invalid"; reason: PilotValidationReason; field: string }
  | {
      status: "declined";
      reasons: PilotDeclineReason[];
      application: NormalizedPilotApplication;
    }
  | { status: "qualified"; application: NormalizedPilotApplication };

export type PilotCheckoutResponse =
  | {
      status: "validation_failed";
      reason: PilotValidationReason;
      field: string;
    }
  | { status: "declined"; reasons: PilotDeclineReason[] }
  | { status: "access_denied" }
  | { status: "pilot_closed" }
  | { status: "checkout_expired" }
  | { status: "checkout_unavailable" }
  | {
      status: "checkout_created";
      applicationId: string;
      checkoutUrl: string;
    };

export type PilotCheckoutStatusResponse =
  | { status: "not_found" }
  | { status: "status_unavailable" }
  | { status: "payment_pending" }
  | { status: "paid" }
  | { status: "refunded" };
