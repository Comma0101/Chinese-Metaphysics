import type postgres from "postgres";

import {
  PILOT_COHORT_VERSION,
  type NormalizedPilotApplication,
  type PilotDeclineReason,
} from "../contracts/pilot";
import type { DatabaseClient } from "./db";
import {
  buildNotificationIdempotencyKey,
  notificationJobsForEventFact,
  resolveFrozenNotificationPayload,
  type ClaimedNotificationJob,
  type FrozenNotificationPayloadResult,
  type NotificationMessage,
} from "./notifications";

export const APPLICATION_STATES = [
  "submitted",
  "qualified",
  "declined",
  "safety_refused",
  "checkout_created",
  "deposit_paid",
  "deposit_refunded",
  "withdrawn",
  "redacted",
] as const;

export type ApplicationState = (typeof APPLICATION_STATES)[number];

const ALLOWED_TRANSITIONS: Record<ApplicationState, readonly ApplicationState[]> = {
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

const SAFE_METADATA_KEYS = [
  "cohort",
  "stripeEventType",
  "processor",
  "sourceStatus",
  "recipientRole",
] as const;
const SAFE_METADATA_KEY_SET = new Set<string>(SAFE_METADATA_KEYS);
const AUDIT_CODE = /^[a-z0-9][a-z0-9_.:-]{0,119}$/;

export type ApplicationEventMetadataKey = (typeof SAFE_METADATA_KEYS)[number];
export type ApplicationEventMetadata = Partial<
  Record<ApplicationEventMetadataKey, string>
>;

export interface ApplicationTransitionInput {
  from: ApplicationState;
  to: ApplicationState;
  actor: string;
  reason: string;
  at?: Date;
  metadata?: ApplicationEventMetadata;
}

export interface ApplicationTransitionEvent {
  from: ApplicationState;
  to: ApplicationState;
  actor: string;
  reason: string;
  occurredAt: Date;
  metadata: ApplicationEventMetadata;
}

export function assertAllowedTransition(
  from: ApplicationState,
  to: ApplicationState,
): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot transition application from ${from} to ${to}`);
  }
}

export function createTransitionEvent(
  input: ApplicationTransitionInput,
): ApplicationTransitionEvent {
  assertAllowedTransition(input.from, input.to);

  const actor = input.actor.trim();
  const reason = input.reason.trim();
  const occurredAt = input.at ?? new Date();
  const metadata = input.metadata ?? {};
  if (
    !AUDIT_CODE.test(actor) ||
    !AUDIT_CODE.test(reason) ||
    Number.isNaN(occurredAt.getTime())
  ) {
    throw new Error("Application transitions require actor, reason, and timestamp");
  }
  const unsafeKey = Object.keys(metadata).find(
    (key) => !SAFE_METADATA_KEY_SET.has(key),
  );
  if (unsafeKey) {
    throw new Error(`Application event metadata key is not allowed: ${unsafeKey}`);
  }
  const normalizedMetadata: ApplicationEventMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value !== "string") {
      throw new Error("Application event metadata values must be code strings");
    }
    const normalized = value.trim();
    if (!AUDIT_CODE.test(normalized)) {
      throw new Error("Application event metadata values must be non-sensitive codes");
    }
    normalizedMetadata[key as ApplicationEventMetadataKey] = normalized;
  }

  return {
    from: input.from,
    to: input.to,
    actor,
    reason,
    occurredAt,
    metadata: normalizedMetadata,
  };
}

const PAYMENT_REFERENCE = /^[A-Za-z0-9_]{1,255}$/;

export interface PaymentReferenceTransitionInput {
  from: ApplicationState;
  to: ApplicationState;
  currentCheckoutSessionId: string | null;
  currentPaymentIntentId: string | null;
  checkoutSessionId?: string;
  paymentIntentId?: string;
}

export interface PaymentReferences {
  checkoutSessionId: string | null;
  paymentIntentId: string | null;
}

const normalizePaymentReference = (
  value: string | undefined,
  field: string,
): string | undefined => {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (!PAYMENT_REFERENCE.test(normalized)) {
    throw new Error(`${field} must be a bounded processor identifier`);
  }
  return normalized;
};

export function resolvePaymentReferences(
  input: PaymentReferenceTransitionInput,
): PaymentReferences {
  assertAllowedTransition(input.from, input.to);
  const suppliedSession = normalizePaymentReference(
    input.checkoutSessionId,
    "checkoutSessionId",
  );
  const suppliedPayment = normalizePaymentReference(
    input.paymentIntentId,
    "paymentIntentId",
  );
  let checkoutSessionId = input.currentCheckoutSessionId;
  let paymentIntentId = input.currentPaymentIntentId;

  if (suppliedSession !== undefined) {
    if (checkoutSessionId !== null && suppliedSession !== checkoutSessionId) {
      throw new Error("checkoutSessionId is write-once");
    }
    if (
      input.to !== "checkout_created" &&
      input.to !== "deposit_paid" &&
      input.to !== "deposit_refunded"
    ) {
      throw new Error("checkoutSessionId is not accepted for this transition");
    }
    if (checkoutSessionId === null && input.to !== "checkout_created") {
      throw new Error("checkoutSessionId may only be assigned at checkout_created");
    }
    checkoutSessionId ??= suppliedSession;
  }
  if (input.to === "checkout_created" && checkoutSessionId === null) {
    throw new Error("checkout_created requires checkoutSessionId");
  }

  if (suppliedPayment !== undefined) {
    if (paymentIntentId !== null && suppliedPayment !== paymentIntentId) {
      throw new Error("paymentIntentId is write-once");
    }
    if (input.to !== "deposit_paid" && input.to !== "deposit_refunded") {
      throw new Error("paymentIntentId is not accepted for this transition");
    }
    if (paymentIntentId === null && input.to !== "deposit_paid") {
      throw new Error("paymentIntentId may only be assigned at deposit_paid");
    }
    paymentIntentId ??= suppliedPayment;
  }
  if (
    input.to === "deposit_paid" &&
    (checkoutSessionId === null || paymentIntentId === null)
  ) {
    throw new Error("deposit_paid requires checkoutSessionId and paymentIntentId");
  }

  return { checkoutSessionId, paymentIntentId };
}

export interface ApplicationDecision {
  status: "qualified" | "declined" | "safety_refused";
  reasons: readonly PilotDeclineReason[];
}

export interface StoredApplication {
  id: string;
  submissionKey: string;
  submissionFingerprint: string;
  status: ApplicationState;
  email: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  decisionType: string | null;
  decisionWindow: string | null;
  qualificationReasons: string[];
  depositAmount: number;
  currency: "usd";
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  retentionDeleteAfter: Date | null;
  redactedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type ApplicationRow = {
  id: string;
  submission_key: string;
  submission_fingerprint: string;
  status: ApplicationState;
  email: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  decision_type: string | null;
  decision_window: string | null;
  qualification_reasons: string[];
  deposit_amount: number;
  currency: "usd";
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  retention_delete_after: Date | null;
  redacted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export interface SafeApplicationSummary {
  id: string;
  status: ApplicationState;
  createdAt: Date;
  retentionDeleteAfter: Date | null;
  notifications: {
    pending: number;
    failed: number;
    sent: number;
  };
}

type SafeApplicationSummaryRow = {
  id: string;
  status: ApplicationState;
  created_at: Date;
  retention_delete_after: Date | null;
  notifications_pending: number;
  notifications_failed: number;
  notifications_sent: number;
};

export interface SafeRetentionCandidate {
  id: string;
  status: ApplicationState;
  retentionDeleteAfter: Date;
}

type SafeRetentionCandidateRow = {
  id: string;
  status: ApplicationState;
  retention_delete_after: Date;
};

const mapApplication = (row: ApplicationRow): StoredApplication => ({
  id: row.id,
  submissionKey: row.submission_key,
  submissionFingerprint: row.submission_fingerprint,
  status: row.status,
  email: row.email,
  country: row.country,
  region: row.region,
  city: row.city,
  decisionType: row.decision_type,
  decisionWindow: row.decision_window,
  qualificationReasons: row.qualification_reasons,
  depositAmount: row.deposit_amount,
  currency: row.currency,
  stripeCheckoutSessionId: row.stripe_checkout_session_id,
  stripePaymentIntentId: row.stripe_payment_intent_id,
  retentionDeleteAfter: row.retention_delete_after,
  redactedAt: row.redacted_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const withTransaction = async <T>(
  sql: DatabaseClient,
  work: (transaction: DatabaseClient) => Promise<T>,
): Promise<T> =>
  "begin" in sql
    ? (sql.begin((transaction) => work(transaction)) as Promise<T>)
    : work(sql);

const resolveDatabase = async (
  sql?: DatabaseClient,
): Promise<DatabaseClient> =>
  sql ?? (await import("./db")).getDatabase();

const findApplication = async (
  sql: DatabaseClient,
  predicate: postgres.PendingQuery<ApplicationRow[]>,
): Promise<StoredApplication | null> => {
  const rows = await predicate;
  return rows[0] ? mapApplication(rows[0]) : null;
};

export interface ApplicationSubmissionIdentity {
  submissionKey: string;
  submissionFingerprint: string;
}

export class SubmissionConflictError extends Error {
  constructor() {
    super("Submission key is already bound to different content");
    this.name = "SubmissionConflictError";
  }
}

const SUBMISSION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUBMISSION_FINGERPRINT = /^[a-f0-9]{64}$/;

export async function createApplication(
  application: NormalizedPilotApplication,
  decision: ApplicationDecision,
  submission: ApplicationSubmissionIdentity,
  sql?: DatabaseClient,
): Promise<StoredApplication> {
  if (
    !SUBMISSION_UUID.test(submission.submissionKey) ||
    !SUBMISSION_FINGERPRINT.test(submission.submissionFingerprint)
  ) {
    throw new Error("Invalid submission identity");
  }
  const database = await resolveDatabase(sql);
  return withTransaction(database, async (transaction) => {
    const attribution = application.attribution;
    const rows = await transaction<ApplicationRow[]>`
      insert into pilot_applications (
        submission_key, submission_fingerprint, status, email, lang, country,
        region, city, decision_type, decision_window,
        age_confirmed, price_acknowledged, framework_accepted, agency_accepted,
        scope_accepted, self_only_data_confirmed, acute_crisis, restricted_advice,
        marketing_consent, attribution_source, attribution_medium,
        attribution_campaign, attribution_referrer, friend_graph,
        qualification_reasons
      ) values (
        ${submission.submissionKey}, ${submission.submissionFingerprint},
        ${decision.status}, ${application.email}, ${application.lang},
        ${application.country}, ${application.region}, ${application.city},
        ${application.decisionType}, ${application.decisionWindow},
        ${application.ageConfirmed}, ${application.priceAcknowledged},
        ${application.frameworkAccepted}, ${application.agencyAccepted},
        ${application.scopeAccepted}, ${application.selfOnlyDataConfirmed},
        ${application.acuteCrisis}, ${application.restrictedAdvice},
        ${application.marketingConsent ?? null}, ${attribution?.source ?? null},
        ${attribution?.medium ?? null}, ${attribution?.campaign ?? null},
        ${attribution?.referrer ?? null}, ${attribution?.friendGraph ?? "unknown"},
        ${transaction.array([...decision.reasons])}
      )
      on conflict (submission_key) do nothing
      returning *
    `;
    let row = rows[0];
    if (!row) {
      const existingRows = await transaction<ApplicationRow[]>`
        select * from pilot_applications
        where submission_key = ${submission.submissionKey}
        limit 1
      `;
      row = existingRows[0];
      if (!row) throw new Error("Application replay could not be resolved");
      if (row.submission_fingerprint !== submission.submissionFingerprint) {
        throw new SubmissionConflictError();
      }
      return mapApplication(row);
    }

    await transaction`
      insert into application_consents (
        application_id, privacy_consent, terms_accepted,
        deposit_policy_accepted, software_disclosure_acknowledged,
        marketing_consent, pilot_consent_version, privacy_notice_version,
        terms_version, deposit_policy_version, software_disclosure_version
      ) values (
        ${row.id}, ${application.privacyConsent}, ${application.termsAccepted},
        ${application.depositPolicyAccepted},
        ${application.softwareDisclosureAcknowledged},
        ${application.marketingConsent ?? null}, ${application.pilotConsentVersion},
        ${application.privacyNoticeVersion}, ${application.termsVersion},
        ${application.depositPolicyVersion}, ${application.softwareDisclosureVersion}
      )
    `;
    await transaction`
      insert into application_events (
        application_id, from_state, to_state, actor, reason, metadata
      ) values (
        ${row.id}, null, 'submitted', 'system', 'application_received', '{}'::jsonb
      )
    `;
    const qualificationEvents = await transaction<{
      id: string;
      occurred_at: Date;
    }[]>`
      insert into application_events (
        application_id, from_state, to_state, actor, reason, metadata
      ) values (
        ${row.id}, 'submitted', ${decision.status}, 'system',
        ${decision.status === "qualified" ? "qualification_passed" : "qualification_not_passed"},
        '{}'::jsonb
      )
      returning id::text as id, occurred_at
    `;
    await enqueueApplicationNotificationJob(
      transaction,
      row.id,
      qualificationEvents[0]!.id,
      {
        state: decision.status,
        amount: row.deposit_amount,
        currency: row.currency,
        occurredAt: qualificationEvents[0]!.occurred_at,
        cohort: PILOT_COHORT_VERSION,
        country: row.country,
        region: row.region,
      },
    );
    return mapApplication(row);
  });
}

export async function getApplicationById(
  id: string,
  sql?: DatabaseClient,
): Promise<StoredApplication | null> {
  const database = await resolveDatabase(sql);
  return findApplication(
    database,
    database<ApplicationRow[]>`select * from pilot_applications where id = ${id} limit 1`,
  );
}

export async function listApplicationSummaries(
  limit = 50,
  sql?: DatabaseClient,
): Promise<SafeApplicationSummary[]> {
  const database = await resolveDatabase(sql);
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
  const rows = await database<SafeApplicationSummaryRow[]>`
    select
      a.id,
      a.status,
      a.created_at,
      a.retention_delete_after,
      count(n.id) filter (where n.status = 'pending')::int as notifications_pending,
      count(n.id) filter (where n.status = 'failed')::int as notifications_failed,
      count(n.id) filter (where n.status = 'sent')::int as notifications_sent
    from pilot_applications a
    left join notification_attempts n on n.application_id = a.id
    group by a.id, a.status, a.created_at, a.retention_delete_after
    order by a.created_at desc
    limit ${safeLimit}
  `;
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    retentionDeleteAfter: row.retention_delete_after,
    notifications: {
      pending: row.notifications_pending,
      failed: row.notifications_failed,
      sent: row.notifications_sent,
    },
  }));
}

export async function getApplicationByCheckoutSession(
  sessionId: string,
  sql?: DatabaseClient,
): Promise<StoredApplication | null> {
  const database = await resolveDatabase(sql);
  return findApplication(
    database,
    database<ApplicationRow[]>`
      select * from pilot_applications
      where stripe_checkout_session_id = ${sessionId}
      limit 1
    `,
  );
}

export async function getApplicationByPaymentIntent(
  paymentIntentId: string,
  sql?: DatabaseClient,
): Promise<StoredApplication | null> {
  const database = await resolveDatabase(sql);
  return findApplication(
    database,
    database<ApplicationRow[]>`
      select * from pilot_applications
      where stripe_payment_intent_id = ${paymentIntentId}
      limit 1
    `,
  );
}

export interface PersistedTransitionInput
  extends Omit<ApplicationTransitionInput, "from"> {
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}

const transitionApplicationInTransaction = async (
  id: string,
  input: PersistedTransitionInput,
  transaction: DatabaseClient,
): Promise<StoredApplication> => {
  const currentRows = await transaction<ApplicationRow[]>`
    select * from pilot_applications where id = ${id} for update
  `;
  const current = currentRows[0];
  if (!current) throw new Error("Application not found");

  const event = createTransitionEvent({ ...input, from: current.status });
  const paymentReferences = resolvePaymentReferences({
    from: current.status,
    to: event.to,
    currentCheckoutSessionId: current.stripe_checkout_session_id,
    currentPaymentIntentId: current.stripe_payment_intent_id,
    ...(input.stripeCheckoutSessionId === undefined
      ? {}
      : { checkoutSessionId: input.stripeCheckoutSessionId }),
    ...(input.stripePaymentIntentId === undefined
      ? {}
      : { paymentIntentId: input.stripePaymentIntentId }),
  });
  const paid = event.to === "deposit_paid";
  const rows = await transaction<ApplicationRow[]>`
    update pilot_applications
    set status = ${event.to},
        stripe_checkout_session_id = coalesce(
          stripe_checkout_session_id,
          ${paymentReferences.checkoutSessionId}
        ),
        stripe_payment_intent_id = coalesce(
          stripe_payment_intent_id,
          ${paymentReferences.paymentIntentId}
        ),
        retention_delete_after = case
          when ${paid} then null
          else coalesce(retention_delete_after, now() + interval '90 days')
        end,
        updated_at = ${event.occurredAt}
    where id = ${id}
    returning *
  `;
  await transaction`
    insert into application_events (
      application_id, from_state, to_state, actor, reason, occurred_at, metadata
    ) values (
      ${id}, ${event.from}, ${event.to}, ${event.actor}, ${event.reason},
      ${event.occurredAt}, ${transaction.json(event.metadata)}
    )
  `;
  return mapApplication(rows[0]!);
};

export async function transitionApplication(
  id: string,
  input: PersistedTransitionInput,
  sql?: DatabaseClient,
): Promise<StoredApplication> {
  if (input.to === "deposit_paid" || input.to === "deposit_refunded") {
    throw new Error(
      "Only the Stripe webhook repository may write payment states",
    );
  }
  const database = await resolveDatabase(sql);
  return withTransaction(database, (transaction) =>
    transitionApplicationInTransaction(id, input, transaction),
  );
}

export interface StripeEventInput {
  eventId: string;
  eventType: string;
  eventFact:
    | "deposit_paid"
    | "late_payment"
    | "payment_mismatch"
    | "full_refund"
    | "partial_refund"
    | "dispute_created"
    | "dispute_closed";
  applicationId: string | null;
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
  amount: number | null;
  amountRefunded: number | null;
  currency: string | null;
  disputeStatus: string | null;
}

export type NotificationKind =
  | "founder_application_received"
  | "founder_deposit_paid"
  | "client_deposit_paid"
  | "founder_payment_alert";

export type NotificationRecipientRole = "founder" | "client";

export type NotificationErrorCode =
  | "rate_limited"
  | "concurrent_request"
  | "invalid_request"
  | "provider_unavailable"
  | "timeout"
  | "stale_state"
  | "recipient_unavailable";

export type StripeApplicationEvent =
  | {
      kind: "paid";
      eventId: string;
      eventType:
        | "checkout.session.completed"
        | "checkout.session.async_payment_succeeded";
      applicationId: string;
      checkoutSessionId: string;
      paymentIntentId: string;
      amount: number;
      currency: string;
    }
  | {
      kind: "payment_mismatch";
      eventId: string;
      eventType:
        | "checkout.session.completed"
        | "checkout.session.async_payment_succeeded";
      applicationId: string;
      checkoutSessionId: string;
      paymentIntentId: string;
      amount: number | null;
      currency: string | null;
      mismatchCode: "mode" | "currency" | "amount" | "cohort" | "policy";
    }
  | {
      kind: "refund";
      eventId: string;
      eventType: "charge.refunded";
      paymentIntentId: string;
      full: boolean;
      amount: number;
      amountRefunded: number;
      currency: string;
    }
  | {
      kind: "dispute";
      eventId: string;
      eventType: "charge.dispute.created" | "charge.dispute.closed";
      paymentIntentId: string;
      amount: number;
      currency: string;
      disputeStatus:
        | "warning_needs_response"
        | "warning_under_review"
        | "warning_closed"
        | "needs_response"
        | "under_review"
        | "won"
        | "lost";
    };

export type StripeApplicationPlan =
  | { kind: "transition"; transitions: PersistedTransitionInput[] }
  | {
      kind: "record_only";
      code?: "partial_refund" | "late_payment" | "payment_mismatch";
    };

export interface StripeApplicationPlanContext {
  paymentReferenceSource?: "application" | "audit";
}

const stripeMetadata = (
  event: StripeApplicationEvent,
  sourceStatus: "paid" | "full_refund",
): ApplicationEventMetadata => ({
  processor: "stripe",
  stripeEventType: event.eventType,
  sourceStatus,
});

export function planStripeApplicationEvent(
  application: StoredApplication,
  event: StripeApplicationEvent,
  context: StripeApplicationPlanContext = {},
): StripeApplicationPlan {
  if (event.kind === "payment_mismatch") {
    if (
      application.stripeCheckoutSessionId !== null &&
      application.stripeCheckoutSessionId !== event.checkoutSessionId
    ) {
      throw new Error("Stripe payment anomaly checkout reference mismatch");
    }
    if (
      application.stripePaymentIntentId !== null &&
      application.stripePaymentIntentId !== event.paymentIntentId
    ) {
      throw new Error("Stripe payment anomaly intent reference mismatch");
    }
    if (
      application.status === "submitted" ||
      application.status === "declined"
    ) {
      throw new Error("Stripe payment anomaly is invalid for application state");
    }
    return { kind: "record_only", code: "payment_mismatch" };
  }
  if (event.kind === "dispute") {
    if (context.paymentReferenceSource === "audit") {
      return { kind: "record_only" };
    }
    if (
      application.stripePaymentIntentId !== null &&
      application.stripePaymentIntentId !== event.paymentIntentId
    ) {
      throw new Error("Stripe dispute payment reference mismatch");
    }
    return { kind: "record_only" };
  }
  if (event.kind === "refund") {
    if (context.paymentReferenceSource === "audit") {
      return event.full
        ? { kind: "record_only" }
        : { kind: "record_only", code: "partial_refund" };
    }
    if (
      application.stripePaymentIntentId !== null &&
      application.stripePaymentIntentId !== event.paymentIntentId
    ) {
      throw new Error("Stripe refund payment reference mismatch");
    }
    if (!event.full) return { kind: "record_only", code: "partial_refund" };
    if (
      application.status === "deposit_refunded" ||
      application.status === "safety_refused" ||
      application.status === "withdrawn" ||
      application.status === "redacted"
    ) {
      return { kind: "record_only" };
    }
    if (application.status !== "deposit_paid") {
      throw new Error("Stripe refund is invalid for application state");
    }
    return {
      kind: "transition",
      transitions: [
        {
          to: "deposit_refunded",
          actor: "stripe_webhook",
          reason: "charge_refunded",
          metadata: stripeMetadata(event, "full_refund"),
          stripePaymentIntentId: event.paymentIntentId,
        },
      ],
    };
  }

  const metadata = stripeMetadata(event, "paid");
  const paidTransition: PersistedTransitionInput = {
    to: "deposit_paid",
    actor: "stripe_webhook",
    reason:
      event.eventType === "checkout.session.completed"
        ? "checkout_completed"
        : "async_payment_succeeded",
    metadata,
    stripeCheckoutSessionId: event.checkoutSessionId,
    stripePaymentIntentId: event.paymentIntentId,
  };
  if (application.status === "qualified") {
    return {
      kind: "transition",
      transitions: [
        {
          to: "checkout_created",
          actor: "stripe_webhook",
          reason: "checkout_reconciled",
          metadata,
          stripeCheckoutSessionId: event.checkoutSessionId,
        },
        paidTransition,
      ],
    };
  }
  if (application.status === "checkout_created") {
    if (application.stripeCheckoutSessionId !== event.checkoutSessionId) {
      throw new Error("Stripe checkout reference mismatch");
    }
    return { kind: "transition", transitions: [paidTransition] };
  }
  if (application.status === "deposit_paid") {
    if (
      application.stripeCheckoutSessionId !== event.checkoutSessionId ||
      application.stripePaymentIntentId !== event.paymentIntentId
    ) {
      throw new Error("Stripe paid references mismatch");
    }
    return { kind: "record_only" };
  }
  if (
    application.status === "safety_refused" ||
    application.status === "withdrawn" ||
    application.status === "redacted"
  ) {
    if (
      application.stripeCheckoutSessionId !== event.checkoutSessionId ||
      (application.stripePaymentIntentId !== null &&
        application.stripePaymentIntentId !== event.paymentIntentId)
    ) {
      throw new Error("Stripe late payment references mismatch");
    }
    return { kind: "record_only", code: "late_payment" };
  }
  throw new Error("Stripe payment is invalid for application state");
}

export type ApplyStripeEventResult =
  | { status: "processed" | "duplicate" }
  | {
      status: "ignored";
      code: "unknown_application" | "partial_refund";
    }
  | {
      status: "retry";
      code: "unresolved_payment_reference";
    };

const STRIPE_EVENT_ID = /^evt_[A-Za-z0-9_]{1,251}$/;
const APPLICATION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const assertValidStripeApplicationEvent = (
  event: StripeApplicationEvent,
): void => {
  if (!STRIPE_EVENT_ID.test(event.eventId)) {
    throw new Error("Invalid Stripe event identifier");
  }
  if (
    (event.kind === "paid" || event.kind === "payment_mismatch") &&
    !APPLICATION_UUID.test(event.applicationId)
  ) {
    throw new Error("Invalid Stripe application identifier");
  }
  normalizePaymentReference(event.paymentIntentId, "paymentIntentId");
  if (event.kind === "paid" || event.kind === "payment_mismatch") {
    normalizePaymentReference(event.checkoutSessionId, "checkoutSessionId");
  }
};

const stripeEventRecord = (
  event: StripeApplicationEvent,
  applicationId: string,
  plan: StripeApplicationPlan,
): StripeEventInput => {
  const eventFact: StripeEventInput["eventFact"] =
    event.kind === "payment_mismatch"
      ? "payment_mismatch"
      : event.kind === "refund"
        ? event.full
          ? "full_refund"
          : "partial_refund"
        : event.kind === "dispute"
          ? event.eventType === "charge.dispute.created"
            ? "dispute_created"
            : "dispute_closed"
          : plan.kind === "record_only" && plan.code === "late_payment"
            ? "late_payment"
            : "deposit_paid";
  return {
    eventId: event.eventId,
    eventType: event.eventType,
    eventFact,
    applicationId,
    paymentIntentId: event.paymentIntentId,
    checkoutSessionId:
      event.kind === "paid" || event.kind === "payment_mismatch"
        ? event.checkoutSessionId
        : null,
    amount: event.amount,
    amountRefunded: event.kind === "refund" ? event.amountRefunded : null,
    currency: event.currency,
    disputeStatus: event.kind === "dispute" ? event.disputeStatus : null,
  };
};

export async function applyStripeEvent(
  event: StripeApplicationEvent,
  sql?: DatabaseClient,
): Promise<ApplyStripeEventResult> {
  const { isVerifiedStripeWebhookEvent } = await import("./stripe");
  if (!isVerifiedStripeWebhookEvent(event)) {
    throw new Error("applyStripeEvent requires a verified Stripe webhook event");
  }
  assertValidStripeApplicationEvent(event);
  const database = await resolveDatabase(sql);
  return withTransaction(database, async (transaction) => {
    const checkoutEvent =
      event.kind === "paid" || event.kind === "payment_mismatch";
    type LockedApplicationRow = ApplicationRow & {
      canonical_payment_reference?: boolean | null;
      audit_payment_reference?: boolean;
    };
    const rows: LockedApplicationRow[] =
      checkoutEvent
        ? await transaction<LockedApplicationRow[]>`
            select * from pilot_applications
            where id = ${event.applicationId}
            for update
          `
        : await transaction<LockedApplicationRow[]>`
            select a.*,
                   (a.stripe_payment_intent_id = ${event.paymentIntentId})
                     as canonical_payment_reference,
                   exists (
                     select 1 from stripe_events linked
                     where linked.application_id = a.id
                       and linked.payment_intent_id = ${event.paymentIntentId}
                   ) as audit_payment_reference
            from pilot_applications a
            where a.stripe_payment_intent_id = ${event.paymentIntentId}
               or exists (
                 select 1 from stripe_events s
                 where s.application_id = a.id
                   and s.payment_intent_id = ${event.paymentIntentId}
               )
            limit 1
            for update
          `;
    const row = rows[0];
    if (!row) {
      return checkoutEvent
        ? { status: "ignored", code: "unknown_application" }
        : { status: "retry", code: "unresolved_payment_reference" };
    }
    const application = mapApplication(row);
    if (await hasProcessedStripeEvent(transaction, event.eventId)) {
      return { status: "duplicate" };
    }
    const paymentReferenceSource = checkoutEvent
      ? undefined
      : row.canonical_payment_reference === true
        ? "application"
        : row.audit_payment_reference === true
          ? "audit"
          : undefined;
    const plan = planStripeApplicationEvent(application, event, {
      ...(paymentReferenceSource ? { paymentReferenceSource } : {}),
    });

    const auditRecord = stripeEventRecord(event, application.id, plan);
    const inserted = await recordStripeEvent(
      transaction,
      auditRecord,
    );
    if (!inserted) return { status: "duplicate" };
    const sourceState: ApplicationState =
      auditRecord.eventFact === "deposit_paid"
        ? "deposit_paid"
        : auditRecord.eventFact === "full_refund" && plan.kind === "transition"
          ? "deposit_refunded"
          : application.status;
    await enqueueNotificationJobs(transaction, auditRecord, {
      state: sourceState,
      amount: auditRecord.amount ?? application.depositAmount,
      currency: (auditRecord.currency ?? application.currency) as "usd",
      occurredAt: new Date(),
      cohort: PILOT_COHORT_VERSION,
      country: null,
      region: null,
    });

    if (plan.kind === "record_only") {
      return plan.code === "partial_refund"
        ? { status: "ignored", code: "partial_refund" }
        : { status: "processed" };
    }
    for (const transition of plan.transitions) {
      await transitionApplicationInTransaction(
        application.id,
        transition,
        transaction,
      );
    }
    return { status: "processed" };
  });
}

export async function recordStripeEvent(
  sql: DatabaseClient,
  input: StripeEventInput,
): Promise<boolean> {
  const eventTypes = new Set([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "charge.refunded",
    "charge.dispute.created",
    "charge.dispute.closed",
  ]);
  const eventFacts = new Set([
    "deposit_paid",
    "late_payment",
    "payment_mismatch",
    "full_refund",
    "partial_refund",
    "dispute_created",
    "dispute_closed",
  ]);
  const disputeStatuses = new Set([
    "warning_needs_response",
    "warning_under_review",
    "warning_closed",
    "needs_response",
    "under_review",
    "won",
    "lost",
  ]);
  const validAmount = (value: number | null) =>
    value === null ||
    (Number.isSafeInteger(value) && value >= 0 && value <= 999_999_999);
  const invalid =
    !STRIPE_EVENT_ID.test(input.eventId) ||
    !eventTypes.has(input.eventType) ||
    !eventFacts.has(input.eventFact) ||
    (input.applicationId !== null && !APPLICATION_UUID.test(input.applicationId)) ||
    (input.paymentIntentId !== null &&
      !/^pi_[A-Za-z0-9_]{1,252}$/.test(input.paymentIntentId)) ||
    (input.checkoutSessionId !== null &&
      !/^cs_[A-Za-z0-9_]{1,252}$/.test(input.checkoutSessionId)) ||
    !validAmount(input.amount) ||
    !validAmount(input.amountRefunded) ||
    (input.amountRefunded !== null &&
      (input.amount === null || input.amountRefunded > input.amount)) ||
    (input.currency !== null && !/^[a-z]{3}$/.test(input.currency)) ||
    (input.disputeStatus !== null &&
      !disputeStatuses.has(input.disputeStatus));
  if (invalid) throw new Error("Invalid Stripe audit fact");

  const rows = await sql<{ stripe_event_id: string }[]>`
    insert into stripe_events (
      stripe_event_id, event_type, event_fact, application_id,
      payment_intent_id, checkout_session_id, amount, amount_refunded,
      currency, dispute_status
    ) values (
      ${input.eventId}, ${input.eventType}, ${input.eventFact},
      ${input.applicationId}, ${input.paymentIntentId},
      ${input.checkoutSessionId}, ${input.amount}, ${input.amountRefunded},
      ${input.currency}, ${input.disputeStatus}
    )
    on conflict (stripe_event_id) do nothing
    returning stripe_event_id
  `;
  return rows.length === 1;
}

export async function hasProcessedStripeEvent(
  sql: DatabaseClient,
  eventId: string,
): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    select exists(
      select 1 from stripe_events where stripe_event_id = ${eventId}
    ) as exists
  `;
  return rows[0]?.exists === true;
}

export interface NotificationSourceSnapshot {
  state: ApplicationState;
  amount: number;
  currency: string;
  occurredAt: Date;
  cohort: string;
  country: string | null;
  region: string | null;
}

export async function enqueueNotificationJobs(
  sql: DatabaseClient,
  event: StripeEventInput,
  snapshot: NotificationSourceSnapshot,
): Promise<void> {
  for (const job of notificationJobsForEventFact(event.eventFact)) {
    const idempotencyKey = buildNotificationIdempotencyKey(
      event.eventId,
      job.kind,
      job.recipientRole,
    );
    await sql`
      insert into notification_attempts (
        application_id, stripe_event_id, notification_kind, recipient_role,
        idempotency_key, status, attempt_count, next_attempt_at,
        source_state, source_amount, source_currency, source_occurred_at,
        source_cohort, snapshot_country, snapshot_region
      ) values (
        ${event.applicationId}, ${event.eventId}, ${job.kind},
        ${job.recipientRole}, ${idempotencyKey}, 'pending', 0, now(),
        ${snapshot.state}, ${snapshot.amount}, ${snapshot.currency},
        ${snapshot.occurredAt}, ${snapshot.cohort}, ${snapshot.country},
        ${snapshot.region}
      )
      on conflict (stripe_event_id, notification_kind, recipient_role)
        where stripe_event_id is not null do nothing
    `;
  }
}

export async function enqueueApplicationNotificationJob(
  sql: DatabaseClient,
  applicationId: string,
  applicationEventId: string,
  snapshot: NotificationSourceSnapshot,
): Promise<void> {
  const kind: NotificationKind = "founder_application_received";
  const recipientRole: NotificationRecipientRole = "founder";
  const idempotencyKey = buildNotificationIdempotencyKey(
    `application_event:${applicationEventId}`,
    kind,
    recipientRole,
  );
  await sql`
    insert into notification_attempts (
      application_id, application_event_id, notification_kind, recipient_role,
      idempotency_key, status, attempt_count, next_attempt_at,
      source_state, source_amount, source_currency, source_occurred_at,
      source_cohort, snapshot_country, snapshot_region
    ) values (
      ${applicationId}, ${applicationEventId}, ${kind}, ${recipientRole},
      ${idempotencyKey}, 'pending', 0, now(), ${snapshot.state},
      ${snapshot.amount}, ${snapshot.currency}, ${snapshot.occurredAt},
      ${snapshot.cohort}, ${snapshot.country}, ${snapshot.region}
    )
    on conflict (application_event_id, notification_kind, recipient_role)
      where application_event_id is not null do nothing
  `;
}

type NotificationJobRow = {
  id: string;
  application_id: string;
  stripe_event_id: string | null;
  application_event_id: string | null;
  event_fact: StripeEventInput["eventFact"] | null;
  source_occurred_at: Date;
  source_state: ApplicationState;
  source_amount: number;
  source_currency: string;
  source_cohort: string;
  snapshot_country: string | null;
  snapshot_region: string | null;
  notification_kind: NotificationKind;
  recipient_role: NotificationRecipientRole;
  idempotency_key: string;
  attempt_count: number;
  lease_token: string;
  client_email: string | null;
  payload_to: string | null;
  payload_from: string | null;
  payload_subject: string | null;
  payload_text: string | null;
  payload_hash: string | null;
};

const mapNotificationJob = (
  row: NotificationJobRow,
): ClaimedNotificationJob => ({
  id: row.id,
  applicationId: row.application_id,
  stripeEventId: row.stripe_event_id,
  applicationEventId: row.application_event_id,
  eventFact: row.event_fact,
  eventOccurredAt: row.source_occurred_at,
  lifecycleState: row.source_state,
  depositAmount: row.source_amount,
  currency: row.source_currency,
  cohortVersion: row.source_cohort,
  country: row.snapshot_country,
  region: row.snapshot_region,
  notificationKind: row.notification_kind,
  recipientRole: row.recipient_role,
  idempotencyKey: row.idempotency_key,
  attemptCount: row.attempt_count,
  leaseToken: row.lease_token,
  clientEmail: row.client_email,
  frozenPayload:
    row.payload_hash && row.payload_to && row.payload_from &&
    row.payload_subject && row.payload_text
      ? {
          from: row.payload_from,
          to: row.payload_to,
          subject: row.payload_subject,
          text: row.payload_text,
          hash: row.payload_hash,
        }
      : null,
});

const claimNotificationJobsBySource = async (
  source: "stripe" | "application" | "all",
  sourceId: string | null,
  limit: number,
  sql?: DatabaseClient,
): Promise<ClaimedNotificationJob[]> => {
  const database = await resolveDatabase(sql);
  return withTransaction(database, async (transaction) => {
    const rows = await transaction<NotificationJobRow[]>`
      with candidates as (
        select id
        from notification_attempts
        where (
            ${source === "all"}
            or (${source === "stripe"} and stripe_event_id = ${sourceId})
            or (
              ${source === "application"}
              and application_id::text = ${sourceId}
              and application_event_id is not null
            )
          )
          and (
            (
              status in ('pending', 'failed') and attempt_count < 5
              and next_attempt_at <= now()
            )
            or (
              status = 'sending'
              and locked_at < now() - interval '5 minutes'
            )
          )
        order by id
        limit ${limit}
        for update skip locked
      ), claimed as (
        update notification_attempts n
        set status = 'sending',
            attempt_count = case
              when n.status = 'sending' then n.attempt_count
              else n.attempt_count + 1
            end,
            lease_token = gen_random_uuid(), locked_at = now(), updated_at = now()
        from candidates c
        where n.id = c.id
        returning n.*
      )
      select c.id::text as id, c.application_id, c.stripe_event_id,
             c.application_event_id::text as application_event_id,
             s.event_fact, c.source_occurred_at, c.source_state,
             c.source_amount, c.source_currency, c.source_cohort,
             c.snapshot_country, c.snapshot_region,
             c.notification_kind, c.recipient_role, c.idempotency_key,
             c.attempt_count, c.lease_token,
             c.payload_to, c.payload_from, c.payload_subject,
             c.payload_text, c.payload_hash,
             case when c.recipient_role = 'client' then a.email else null end
               as client_email
      from claimed c
      join pilot_applications a on a.id = c.application_id
      left join stripe_events s on s.stripe_event_id = c.stripe_event_id
      order by c.id
    `;
    return rows.map(mapNotificationJob);
  });
};

export async function claimNotificationJobs(
  eventId: string,
  sql?: DatabaseClient,
): Promise<ClaimedNotificationJob[]> {
  if (!STRIPE_EVENT_ID.test(eventId)) throw new Error("Invalid Stripe event identifier");
  return claimNotificationJobsBySource("stripe", eventId, 100, sql);
}

export async function claimApplicationNotificationJobs(
  applicationId: string,
  sql?: DatabaseClient,
): Promise<ClaimedNotificationJob[]> {
  if (!APPLICATION_UUID.test(applicationId)) {
    throw new Error("Invalid application identifier");
  }
  return claimNotificationJobsBySource("application", applicationId, 100, sql);
}

export async function claimDueNotificationJobs(
  limit = 10,
  sql?: DatabaseClient,
): Promise<ClaimedNotificationJob[]> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 10));
  return claimNotificationJobsBySource("all", null, safeLimit, sql);
}

const NOTIFICATION_ERROR_CODE = /^[a-z0-9][a-z0-9_.:-]{0,119}$/;
const PROVIDER_MESSAGE_ID = /^[A-Za-z0-9_-]{1,255}$/;

export async function markNotificationSent(
  jobId: string,
  attemptCount: number,
  leaseToken: string,
  providerMessageId: string,
  sql?: DatabaseClient,
): Promise<void> {
  if (
    !/^\d{1,20}$/.test(jobId) ||
    !APPLICATION_UUID.test(leaseToken) ||
    !PROVIDER_MESSAGE_ID.test(providerMessageId) ||
    !Number.isInteger(attemptCount) ||
    attemptCount < 1 ||
    attemptCount > 5
  ) {
    throw new Error("Invalid notification completion reference");
  }
  const database = await resolveDatabase(sql);
  const rows = await database<{ id: string }[]>`
    update notification_attempts
    set status = 'sent', provider_message_id = ${providerMessageId},
        last_error_code = null, next_attempt_at = null, locked_at = null,
        lease_token = null, updated_at = now()
    where id = ${jobId} and status = 'sending'
      and attempt_count = ${attemptCount} and lease_token = ${leaseToken}
    returning id::text as id
  `;
  if (!rows[0]) throw new Error("lease_lost");
}

export async function markNotificationFailed(
  jobId: string,
  errorCode: NotificationErrorCode,
  retryable: boolean,
  attemptCount: number,
  leaseToken: string,
  sql?: DatabaseClient,
): Promise<void> {
  if (
    !/^\d{1,20}$/.test(jobId) ||
    !NOTIFICATION_ERROR_CODE.test(errorCode) ||
    !APPLICATION_UUID.test(leaseToken) ||
    !Number.isInteger(attemptCount) ||
    attemptCount < 1 ||
    attemptCount > 5
  ) {
    throw new Error("Invalid notification failure fact");
  }
  const database = await resolveDatabase(sql);
  const rows = await database<{ id: string }[]>`
    update notification_attempts
    set status = 'failed', last_error_code = ${errorCode},
        next_attempt_at = case
          when ${retryable} and attempt_count < 5
            then now() + least(power(2, attempt_count), 60) * interval '1 minute'
          else null
        end,
        locked_at = null, lease_token = null, updated_at = now()
    where id = ${jobId} and status = 'sending'
      and attempt_count = ${attemptCount}
      and lease_token = ${leaseToken}
    returning id::text as id
  `;
  if (!rows[0]) throw new Error("lease_lost");
}

type FrozenPayloadRow = {
  idempotency_key: string;
  payload_to: string | null;
  payload_from: string | null;
  payload_subject: string | null;
  payload_text: string | null;
  payload_hash: string | null;
};

export async function freezeNotificationPayload(
  jobId: string,
  attemptCount: number,
  leaseToken: string,
  candidate: NotificationMessage,
  sql?: DatabaseClient,
): Promise<FrozenNotificationPayloadResult> {
  if (
    !/^\d{1,20}$/.test(jobId) ||
    !APPLICATION_UUID.test(leaseToken) ||
    !Number.isInteger(attemptCount) ||
    attemptCount < 1 ||
    attemptCount > 5
  ) {
    throw new Error("Invalid notification lease");
  }
  const database = await resolveDatabase(sql);
  return withTransaction(database, async (transaction) => {
    const rows = await transaction<FrozenPayloadRow[]>`
      select idempotency_key, payload_to, payload_from, payload_subject,
             payload_text, payload_hash
      from notification_attempts
      where id = ${jobId} and status = 'sending'
        and attempt_count = ${attemptCount} and lease_token = ${leaseToken}
      for update
    `;
    const row = rows[0];
    if (!row) throw new Error("lease_lost");
    const existing =
      row.payload_hash && row.payload_to && row.payload_from &&
      row.payload_subject && row.payload_text
        ? {
            from: row.payload_from,
            to: row.payload_to,
            subject: row.payload_subject,
            text: row.payload_text,
            idempotencyKey: row.idempotency_key,
          }
        : null;
    const resolved = resolveFrozenNotificationPayload(
      existing,
      candidate,
      row.payload_hash ?? undefined,
    );
    if (!existing) {
      const updated = await transaction<{ id: string }[]>`
        update notification_attempts
        set payload_to = ${resolved.message.to},
            payload_from = ${resolved.message.from},
            payload_subject = ${resolved.message.subject},
            payload_text = ${resolved.message.text},
            payload_hash = ${resolved.hash}, updated_at = now()
        where id = ${jobId} and status = 'sending'
          and attempt_count = ${attemptCount} and lease_token = ${leaseToken}
        returning id::text as id
      `;
      if (!updated[0]) throw new Error("lease_lost");
    }
    return resolved;
  });
}

const hasRetryableNotificationJobsBySource = async (
  source: "stripe" | "application" | "all",
  sourceId: string | null,
  sql?: DatabaseClient,
): Promise<boolean> => {
  const database = await resolveDatabase(sql);
  const rows = await database<{ exists: boolean }[]>`
    select exists(
      select 1 from notification_attempts
      where (
          ${source === "all"}
          or (${source === "stripe"} and stripe_event_id = ${sourceId})
          or (
            ${source === "application"}
            and application_id::text = ${sourceId}
            and application_event_id is not null
          )
        )
        and (
          status = 'sending'
          or (
            status in ('pending', 'failed') and attempt_count < 5
            and next_attempt_at is not null
          )
        )
    ) as exists
  `;
  return rows[0]?.exists === true;
};

export async function hasRetryableNotificationJobs(
  eventId: string,
  sql?: DatabaseClient,
): Promise<boolean> {
  if (!STRIPE_EVENT_ID.test(eventId)) throw new Error("Invalid Stripe event identifier");
  return hasRetryableNotificationJobsBySource("stripe", eventId, sql);
}

export async function hasRetryableApplicationNotificationJobs(
  applicationId: string,
  sql?: DatabaseClient,
): Promise<boolean> {
  if (!APPLICATION_UUID.test(applicationId)) {
    throw new Error("Invalid application identifier");
  }
  return hasRetryableNotificationJobsBySource("application", applicationId, sql);
}

export async function hasRetryableDueNotificationJobs(
  sql?: DatabaseClient,
): Promise<boolean> {
  return hasRetryableNotificationJobsBySource("all", null, sql);
}

export async function exportApplicationAggregate(
  id: string,
  sql?: DatabaseClient,
): Promise<Record<string, unknown> | null> {
  const database = await resolveDatabase(sql);
  const rows = await database<{ aggregate: Record<string, unknown> }[]>`
    select jsonb_build_object(
      'application', to_jsonb(a),
      'consents', to_jsonb(c),
      'events', coalesce((
        select jsonb_agg(to_jsonb(e) order by e.occurred_at)
        from application_events e where e.application_id = a.id
      ), '[]'::jsonb),
      'stripeEvents', coalesce((
        select jsonb_agg(to_jsonb(s) order by s.processed_at)
        from stripe_events s where s.application_id = a.id
      ), '[]'::jsonb),
      'notificationAttempts', coalesce((
        select jsonb_agg(to_jsonb(n) order by n.created_at)
        from notification_attempts n where n.application_id = a.id
      ), '[]'::jsonb)
    ) as aggregate
    from pilot_applications a
    left join application_consents c on c.application_id = a.id
    where a.id = ${id}
  `;
  return rows[0]?.aggregate ?? null;
}

const redactLockedApplication = async (
  current: ApplicationRow,
  actor: string,
  reason: string,
  transaction: DatabaseClient,
): Promise<StoredApplication> => {
  const id = current.id;
  const event = createTransitionEvent({
    from: current.status,
    to: "redacted",
    actor,
    reason,
  });

  const rows = await transaction<ApplicationRow[]>`
    update pilot_applications
    set status = 'redacted', submission_key = gen_random_uuid(),
        submission_fingerprint = encode(gen_random_bytes(32), 'hex'),
        email = null, lang = null, country = null,
        region = null, city = null, decision_type = null,
        decision_window = null, attribution_source = null,
        attribution_medium = null, attribution_campaign = null,
        attribution_referrer = null, friend_graph = null,
        age_confirmed = null, price_acknowledged = null,
        framework_accepted = null, agency_accepted = null,
        scope_accepted = null, self_only_data_confirmed = null,
        acute_crisis = null, restricted_advice = null,
        marketing_consent = null, qualification_reasons = '{}',
        redacted_at = ${event.occurredAt},
        retention_delete_after = null, updated_at = ${event.occurredAt}
    where id = ${id}
    returning *
  `;
  await transaction`
    update notification_attempts
    set payload_to = null, payload_from = null, payload_subject = null,
        payload_text = null, payload_hash = null,
        snapshot_country = null, snapshot_region = null,
        source_state = null, source_amount = null, source_currency = null,
        source_occurred_at = null, source_cohort = null,
        status = case when status = 'sent' then 'sent' else 'failed' end,
        last_error_code = case
          when status = 'sent' then last_error_code
          when recipient_role = 'client' then 'recipient_unavailable'
          else 'stale_state'
        end,
        next_attempt_at = null, lease_token = null, locked_at = null,
        updated_at = ${event.occurredAt}
    where application_id = ${id}
  `;
  await transaction`
    insert into application_events (
      application_id, from_state, to_state, actor, reason, occurred_at, metadata
    ) values (
      ${id}, ${event.from}, 'redacted', ${event.actor}, ${event.reason},
      ${event.occurredAt}, '{}'::jsonb
    )
  `;
  return mapApplication(rows[0]!);
};

export async function redactApplication(
  id: string,
  actor: string,
  reason: string,
  sql?: DatabaseClient,
): Promise<StoredApplication> {
  const database = await resolveDatabase(sql);
  return withTransaction(database, async (transaction) => {
    const currentRows = await transaction<ApplicationRow[]>`
      select * from pilot_applications where id = ${id} for update
    `;
    const current = currentRows[0];
    if (!current) throw new Error("Application not found");
    return redactLockedApplication(current, actor, reason, transaction);
  });
}

export async function redactEligibleRetentionCandidate(
  id: string,
  before: Date,
  actor: string,
  reason: string,
  sql?: DatabaseClient,
): Promise<StoredApplication | null> {
  const database = await resolveDatabase(sql);
  return withTransaction(database, async (transaction) => {
    const currentRows = await transaction<ApplicationRow[]>`
      select * from pilot_applications
      where id = ${id}
        and retention_delete_after <= ${before}
        and status in (
          'submitted', 'qualified', 'declined', 'safety_refused',
          'checkout_created', 'deposit_refunded', 'withdrawn'
        )
      for update
    `;
    const current = currentRows[0];
    if (!current) return null;
    return redactLockedApplication(current, actor, reason, transaction);
  });
}

export async function listRetentionCandidates(
  before: Date = new Date(),
  limit = 100,
  sql?: DatabaseClient,
): Promise<StoredApplication[]> {
  const database = await resolveDatabase(sql);
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 500));
  const rows = await database<ApplicationRow[]>`
    select * from pilot_applications
    where retention_delete_after <= ${before}
      and status in (
        'submitted', 'qualified', 'declined', 'safety_refused',
        'checkout_created', 'deposit_refunded', 'withdrawn'
      )
    order by retention_delete_after asc
    limit ${safeLimit}
  `;
  return rows.map(mapApplication);
}

export async function listSafeRetentionCandidates(
  before: Date = new Date(),
  limit = 100,
  sql?: DatabaseClient,
): Promise<SafeRetentionCandidate[]> {
  const database = await resolveDatabase(sql);
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
  const rows = await database<SafeRetentionCandidateRow[]>`
    select id, status, retention_delete_after
    from pilot_applications
    where retention_delete_after <= ${before}
      and status in (
        'submitted', 'qualified', 'declined', 'safety_refused',
        'checkout_created', 'deposit_refunded', 'withdrawn'
      )
    order by retention_delete_after asc
    limit ${safeLimit}
  `;
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    retentionDeleteAfter: row.retention_delete_after,
  }));
}
