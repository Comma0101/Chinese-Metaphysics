import type Stripe from "stripe";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import {
  DEPOSIT_POLICY_VERSION,
  PILOT_COHORT_VERSION,
  type NormalizedPilotApplication,
  type PilotCheckoutResponse,
  type PilotCheckoutStatusResponse,
} from "../contracts/pilot";
import type {
  ApplyStripeEventResult,
  ApplicationDecision,
  ApplicationState,
  PersistedTransitionInput,
  StripeApplicationEvent,
} from "./applications";
import { SubmissionConflictError } from "./applications";
import type { PilotConfig } from "./config";
import { evaluatePilotApplication } from "./qualification";

export const DEPOSIT_AMOUNT_CENTS = 4_900;
export const DEPOSIT_CURRENCY = "usd" as const;
export { PILOT_COHORT_VERSION } from "../contracts/pilot";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
};

export const createSubmissionFingerprint = (
  application: NormalizedPilotApplication,
): string =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(application)))
    .digest("hex");

export const buildStripeIdempotencyKey = (submissionKey: string): string =>
  `pilot-checkout:${submissionKey}`;

export interface DepositCheckoutInput {
  applicationId: string;
  email: string;
  siteUrl: string;
}

export function buildDepositCheckoutParams(
  input: DepositCheckoutInput,
): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    customer_email: input.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: DEPOSIT_CURRENCY,
          unit_amount: DEPOSIT_AMOUNT_CENTS,
          product_data: {
            name: "Meridian · Calibration deposit / 观复 · 校准押金",
            description: "Credited toward the founding core consultation",
          },
        },
      },
    ],
    metadata: {
      applicationId: input.applicationId,
      cohortVersion: PILOT_COHORT_VERSION,
      policyVersion: DEPOSIT_POLICY_VERSION,
    },
    success_url: `${input.siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.siteUrl}/cancel`,
  };
}

export interface CreatedCheckoutSession {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired" | null;
}

interface CreatedApplication {
  id: string;
  email: string | null;
  status?: ApplicationState;
  stripeCheckoutSessionId?: string | null;
}

export type SafeErrorCode =
  | "pilot_config_invalid"
  | "application_persist_failed"
  | "stripe_checkout_create_failed"
  | "stripe_checkout_retrieve_failed"
  | "checkout_transition_failed"
  | "checkout_status_lookup_failed"
  | "stripe_webhook_config_invalid"
  | "stripe_webhook_unresolved_payment_reference"
  | "stripe_webhook_processing_failed"
  | "notification_delivery_failed";

export interface SafeLogEntry {
  correlationId: string;
  code: SafeErrorCode;
  eventId?: string;
}

export type SafeLogger = (entry: SafeLogEntry) => void;

const defaultSafeLogger: SafeLogger = (entry) => {
  console.error(JSON.stringify({ event: "paid_pilot_error", ...entry }));
};

interface ObservabilityDependencies {
  logger?: SafeLogger;
  createCorrelationId?: () => string;
}

export interface CheckoutPostDependencies extends ObservabilityDependencies {
  loadConfig: () => PilotConfig;
  createApplication: (
    application: NormalizedPilotApplication,
    decision: ApplicationDecision,
    submission: {
      submissionKey: string;
      submissionFingerprint: string;
    },
  ) => Promise<CreatedApplication>;
  transitionApplication: (
    id: string,
    transition: PersistedTransitionInput,
  ) => Promise<unknown>;
  createCheckoutSession: (
    stripeSecretKey: string,
    input: DepositCheckoutInput,
    idempotencyKey: string,
  ) => Promise<CreatedCheckoutSession>;
  retrieveCheckoutSession?: (
    stripeSecretKey: string,
    sessionId: string,
  ) => Promise<CreatedCheckoutSession>;
}

const checkoutResponse = (body: PilotCheckoutResponse, status: number) =>
  Response.json(body, { status });

const infrastructureResponse = (
  body: PilotCheckoutResponse | PilotCheckoutStatusResponse,
  correlationId: string,
) =>
  Response.json(body, {
    status: 503,
    headers: { "cache-control": "no-store", "x-request-id": correlationId },
  });

const MAX_APPLICATION_BODY_BYTES = 16 * 1024;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasValidAccessCode(request: Request, expectedHash: string): boolean {
  const accessCode = request.headers.get("x-pilot-access-code");
  if (!accessCode) return false;
  const actual = createHash("sha256").update(accessCode).digest();
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

async function readApplicationBody(
  request: Request,
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; status: 413 | 415 | 422; field: "$body" | "$contentType" }
> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType?.toLowerCase() !== "application/json") {
    return { ok: false, status: 415, field: "$contentType" };
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_APPLICATION_BODY_BYTES) {
    return { ok: false, status: 413, field: "$body" };
  }

  if (!request.body) {
    return { ok: false, status: 422, field: "$body" };
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_APPLICATION_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, status: 413, field: "$body" };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 422, field: "$body" };
  }
}

export function createCheckoutPostHandler(
  dependencies: CheckoutPostDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const correlationId =
      dependencies.createCorrelationId?.() ?? randomUUID();
    const log = dependencies.logger ?? defaultSafeLogger;
    let config: PilotConfig;
    try {
      config = dependencies.loadConfig();
    } catch {
      log({ correlationId, code: "pilot_config_invalid" });
      return infrastructureResponse({ status: "checkout_unavailable" }, correlationId);
    }
    if (!config.enabled) {
      return Response.json(
        { status: "pilot_closed" } satisfies PilotCheckoutResponse,
        {
          status: 503,
          headers: { "cache-control": "no-store", "retry-after": "86400" },
        },
      );
    }
    if (!hasValidAccessCode(request, config.accessCodeHash)) {
      return checkoutResponse({ status: "access_denied" }, 403);
    }
    const submissionKey = request.headers.get("idempotency-key");
    if (!submissionKey || !UUID.test(submissionKey)) {
      return checkoutResponse(
        {
          status: "validation_failed",
          reason: "invalid_field",
          field: "idempotencyKey",
        },
        422,
      );
    }

    const body = await readApplicationBody(request);
    if (!body.ok) {
      return checkoutResponse(
        {
          status: "validation_failed",
          reason: "invalid_field",
          field: body.field,
        },
        body.status,
      );
    }

    const qualification = evaluatePilotApplication(
      body.value,
      config.allowedLocations,
    );
    if (qualification.status === "invalid") {
      return checkoutResponse(
        {
          status: "validation_failed",
          reason: qualification.reason,
          field: qualification.field,
        },
        422,
      );
    }

    const decision: ApplicationDecision =
      qualification.status === "qualified"
        ? { status: "qualified", reasons: [] }
        : {
            status: qualification.reasons.includes("acute_crisis")
              ? "safety_refused"
              : "declined",
            reasons: qualification.reasons,
          };

    let application: CreatedApplication;
    try {
      application = await dependencies.createApplication(
        qualification.application,
        decision,
        {
          submissionKey,
          submissionFingerprint: createSubmissionFingerprint(
            qualification.application,
          ),
        },
      );
    } catch (error) {
      if (error instanceof SubmissionConflictError) {
        return checkoutResponse(
          {
            status: "validation_failed",
            reason: "invalid_field",
            field: "idempotencyKey",
          },
          409,
        );
      }
      log({ correlationId, code: "application_persist_failed" });
      return infrastructureResponse({ status: "checkout_unavailable" }, correlationId);
    }

    if (qualification.status === "declined") {
      return checkoutResponse(
        { status: "declined", reasons: qualification.reasons },
        200,
      );
    }
    if (
      application.status === "checkout_created" &&
      application.stripeCheckoutSessionId
    ) {
      if (!dependencies.retrieveCheckoutSession) {
        return checkoutResponse({ status: "checkout_unavailable" }, 503);
      }
      try {
        const existing = await dependencies.retrieveCheckoutSession(
          config.stripeSecretKey,
          application.stripeCheckoutSessionId,
        );
        if (existing.status !== "open" || !existing.url) {
          return checkoutResponse({ status: "checkout_expired" }, 410);
        }
        return checkoutResponse(
          {
            status: "checkout_created",
            applicationId: application.id,
            checkoutUrl: existing.url,
          },
          200,
        );
      } catch {
        log({ correlationId, code: "stripe_checkout_retrieve_failed" });
        return infrastructureResponse({ status: "checkout_unavailable" }, correlationId);
      }
    }
    if (application.status && application.status !== "qualified") {
      return checkoutResponse({ status: "checkout_unavailable" }, 503);
    }

    let checkout: CreatedCheckoutSession;
    try {
      checkout = await dependencies.createCheckoutSession(
        config.stripeSecretKey,
        {
          applicationId: application.id,
          email: qualification.application.email,
          siteUrl: config.siteUrl,
        },
        buildStripeIdempotencyKey(submissionKey),
      );
    } catch {
      log({ correlationId, code: "stripe_checkout_create_failed" });
      return infrastructureResponse({ status: "checkout_unavailable" }, correlationId);
    }
    if (checkout.status !== "open" || !checkout.url) {
      return checkoutResponse({ status: "checkout_expired" }, 410);
    }
    try {
      await dependencies.transitionApplication(application.id, {
        to: "checkout_created",
        actor: "system",
        reason: "checkout_session_created",
        metadata: { cohort: PILOT_COHORT_VERSION },
        stripeCheckoutSessionId: checkout.id,
      });
      return checkoutResponse(
        {
          status: "checkout_created",
          applicationId: application.id,
          checkoutUrl: checkout.url,
        },
        200,
      );
    } catch {
      log({ correlationId, code: "checkout_transition_failed" });
      return infrastructureResponse({ status: "checkout_unavailable" }, correlationId);
    }
  };
}

interface CheckoutStatusRecord {
  id: string;
  status: ApplicationState;
}

export interface CheckoutStatusDependencies extends ObservabilityDependencies {
  getApplicationByCheckoutSession: (
    sessionId: string,
  ) => Promise<CheckoutStatusRecord | null>;
}

const checkoutNotFound = () =>
  Response.json(
    { status: "not_found" } satisfies PilotCheckoutStatusResponse,
    { status: 404, headers: { "cache-control": "no-store" } },
  );

export function createCheckoutStatusHandler(
  dependencies: CheckoutStatusDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const correlationId =
      dependencies.createCorrelationId?.() ?? randomUUID();
    const log = dependencies.logger ?? defaultSafeLogger;
    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (!sessionId || !/^cs_[A-Za-z0-9_]{1,252}$/.test(sessionId)) {
      return checkoutNotFound();
    }

    let application: CheckoutStatusRecord | null;
    try {
      application = await dependencies.getApplicationByCheckoutSession(sessionId);
    } catch {
      log({ correlationId, code: "checkout_status_lookup_failed" });
      return infrastructureResponse({ status: "status_unavailable" }, correlationId);
    }
    if (!application) return checkoutNotFound();

    let status: "payment_pending" | "paid" | "refunded";
    switch (application.status) {
      case "checkout_created":
        status = "payment_pending";
        break;
      case "deposit_paid":
        status = "paid";
        break;
      case "deposit_refunded":
        status = "refunded";
        break;
      default:
        return checkoutNotFound();
    }

    return Response.json(
      { status } satisfies PilotCheckoutStatusResponse,
      { headers: { "cache-control": "no-store" } },
    );
  };
}

export type StripeWebhookIgnoreCode =
  | "unsupported_event"
  | "payment_not_paid"
  | "missing_application_id"
  | "missing_payment_intent"
  | "invalid_processor_reference"
  | "invalid_financial_fact"
  | "invalid_dispute_status"
  | "invalid_event_id";

export type NormalizedStripeWebhookEvent =
  | StripeApplicationEvent
  | { kind: "ignored"; code: StripeWebhookIgnoreCode };

const STRIPE_EVENT_ID = /^evt_[A-Za-z0-9_]{1,251}$/;
const STRIPE_APPLICATION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STRIPE_CHECKOUT_SESSION_ID = /^cs_[A-Za-z0-9_]{1,252}$/;
const STRIPE_PAYMENT_INTENT_ID = /^pi_[A-Za-z0-9_]{1,252}$/;
const STRIPE_CURRENCY = /^[a-z]{3}$/;
const MAX_STRIPE_AMOUNT = 999_999_999;
const DISPUTE_STATUSES = new Set([
  "warning_needs_response",
  "warning_under_review",
  "warning_closed",
  "needs_response",
  "under_review",
  "won",
  "lost",
] as const);

const isStripeAmount = (value: unknown): value is number =>
  Number.isSafeInteger(value) &&
  typeof value === "number" &&
  value >= 0 &&
  value <= MAX_STRIPE_AMOUNT;

const stripeObjectId = (
  value: string | { id: string } | null,
): string | null => (typeof value === "string" ? value : value?.id ?? null);

export function normalizeStripeWebhookEvent(
  event: Stripe.Event,
): NormalizedStripeWebhookEvent {
  if (!STRIPE_EVENT_ID.test(event.id)) {
    return { kind: "ignored", code: "invalid_event_id" };
  }
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return { kind: "ignored", code: "payment_not_paid" };
    }
    const applicationId = session.metadata?.applicationId;
    if (!applicationId || !STRIPE_APPLICATION_ID.test(applicationId)) {
      return { kind: "ignored", code: "missing_application_id" };
    }
    const paymentIntentId = stripeObjectId(session.payment_intent);
    if (!paymentIntentId) {
      return { kind: "ignored", code: "missing_payment_intent" };
    }
    if (
      !STRIPE_CHECKOUT_SESSION_ID.test(session.id) ||
      !STRIPE_PAYMENT_INTENT_ID.test(paymentIntentId)
    ) {
      return { kind: "ignored", code: "invalid_processor_reference" };
    }
    const amount = isStripeAmount(session.amount_total)
      ? session.amount_total
      : null;
    const currency =
      session.currency && STRIPE_CURRENCY.test(session.currency)
        ? session.currency
        : null;
    const mismatchCode =
      session.mode !== "payment"
        ? "mode"
        : currency !== DEPOSIT_CURRENCY
          ? "currency"
          : amount !== DEPOSIT_AMOUNT_CENTS
            ? "amount"
            : session.metadata?.cohortVersion !== PILOT_COHORT_VERSION
              ? "cohort"
              : session.metadata?.policyVersion !== DEPOSIT_POLICY_VERSION
                ? "policy"
                : null;
    const common = {
      eventId: event.id,
      eventType: event.type,
      applicationId,
      checkoutSessionId: session.id,
      paymentIntentId,
      amount,
      currency,
    };
    return mismatchCode
      ? { kind: "payment_mismatch", ...common, mismatchCode }
      : {
          kind: "paid",
          ...common,
          amount: DEPOSIT_AMOUNT_CENTS,
          currency: DEPOSIT_CURRENCY,
        };
  }
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = stripeObjectId(charge.payment_intent);
    if (!paymentIntentId) {
      return { kind: "ignored", code: "missing_payment_intent" };
    }
    if (!STRIPE_PAYMENT_INTENT_ID.test(paymentIntentId)) {
      return { kind: "ignored", code: "invalid_processor_reference" };
    }
    if (
      !isStripeAmount(charge.amount) ||
      !isStripeAmount(charge.amount_refunded) ||
      !STRIPE_CURRENCY.test(charge.currency)
    ) {
      return { kind: "ignored", code: "invalid_financial_fact" };
    }
    return {
      kind: "refund",
      eventId: event.id,
      eventType: "charge.refunded",
      paymentIntentId,
      full: charge.amount_refunded >= charge.amount,
      amount: charge.amount,
      amountRefunded: charge.amount_refunded,
      currency: charge.currency,
    };
  }
  if (
    event.type === "charge.dispute.created" ||
    event.type === "charge.dispute.closed"
  ) {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId = stripeObjectId(dispute.payment_intent);
    if (!paymentIntentId) {
      return { kind: "ignored", code: "missing_payment_intent" };
    }
    if (!STRIPE_PAYMENT_INTENT_ID.test(paymentIntentId)) {
      return { kind: "ignored", code: "invalid_processor_reference" };
    }
    if (
      !isStripeAmount(dispute.amount) ||
      !STRIPE_CURRENCY.test(dispute.currency)
    ) {
      return { kind: "ignored", code: "invalid_financial_fact" };
    }
    if (!DISPUTE_STATUSES.has(dispute.status)) {
      return { kind: "ignored", code: "invalid_dispute_status" };
    }
    return {
      kind: "dispute",
      eventId: event.id,
      eventType: event.type,
      paymentIntentId,
      amount: dispute.amount,
      currency: dispute.currency,
      disputeStatus: dispute.status,
    };
  }
  return { kind: "ignored", code: "unsupported_event" };
}

export interface StripeWebhookConfig {
  stripeSecretKey: string;
  webhookSecret: string;
}

export interface StripeWebhookDependencies extends ObservabilityDependencies {
  loadConfig: () => StripeWebhookConfig;
  verifyEvent: (
    stripeSecretKey: string,
    webhookSecret: string,
    rawBody: Uint8Array,
    signature: string,
  ) => Promise<NormalizedStripeWebhookEvent> | NormalizedStripeWebhookEvent;
  applyEvent: (event: StripeApplicationEvent) => Promise<ApplyStripeEventResult>;
  deliverNotifications?: (
    eventId: string,
  ) => Promise<{ retryNeeded: boolean }>;
}

const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

const webhookResponse = (
  body: Record<string, string>,
  status: number,
  correlationId?: string,
) =>
  Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...(correlationId ? { "x-request-id": correlationId } : {}),
    },
  });

const readRawWebhookBody = async (
  request: Request,
): Promise<Uint8Array | null> => {
  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_WEBHOOK_BODY_BYTES
  ) {
    return null;
  }
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_WEBHOOK_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
};

export function createStripeWebhookHandler(
  dependencies: StripeWebhookDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return webhookResponse(
        { status: "rejected", code: "missing_signature" },
        400,
      );
    }

    const rawBody = await readRawWebhookBody(request);
    if (!rawBody) {
      return webhookResponse(
        { status: "rejected", code: "body_too_large" },
        413,
      );
    }

    const correlationId =
      dependencies.createCorrelationId?.() ?? randomUUID();
    const log = dependencies.logger ?? defaultSafeLogger;
    let config: StripeWebhookConfig;
    try {
      config = dependencies.loadConfig();
    } catch {
      log({ correlationId, code: "stripe_webhook_config_invalid" });
      return webhookResponse({ status: "retry" }, 500, correlationId);
    }

    let event: NormalizedStripeWebhookEvent;
    try {
      event = await dependencies.verifyEvent(
        config.stripeSecretKey,
        config.webhookSecret,
        rawBody,
        signature,
      );
    } catch {
      return webhookResponse(
        { status: "rejected", code: "invalid_signature" },
        400,
      );
    }

    if (event.kind === "ignored") {
      return webhookResponse({ status: "ignored", code: event.code }, 200);
    }

    let result: ApplyStripeEventResult;
    try {
      result = await dependencies.applyEvent(event);
    } catch {
      log({
        correlationId,
        eventId: event.eventId,
        code: "stripe_webhook_processing_failed",
      });
      return webhookResponse({ status: "retry" }, 500, correlationId);
    }

    if (result.status === "retry") {
      log({
        correlationId,
        eventId: event.eventId,
        code: "stripe_webhook_unresolved_payment_reference",
      });
      return webhookResponse({ status: "retry" }, 500, correlationId);
    }
    const notificationEligible =
      result.status === "processed" ||
      result.status === "duplicate" ||
      (result.status === "ignored" && result.code === "partial_refund");
    if (notificationEligible && dependencies.deliverNotifications) {
      try {
        const delivery = await dependencies.deliverNotifications(event.eventId);
        if (delivery.retryNeeded) {
          log({
            correlationId,
            eventId: event.eventId,
            code: "notification_delivery_failed",
          });
          return webhookResponse({ status: "retry" }, 500, correlationId);
        }
      } catch {
        log({
          correlationId,
          eventId: event.eventId,
          code: "notification_delivery_failed",
        });
        return webhookResponse({ status: "retry" }, 500, correlationId);
      }
    }
    return result.status === "ignored"
      ? webhookResponse({ status: "ignored", code: result.code }, 200)
      : webhookResponse({ status: result.status }, 200);
  };
}
