import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import type {
  ApplicationState,
  NotificationErrorCode,
  NotificationKind,
  NotificationRecipientRole,
  StripeEventInput,
} from "./applications";
import type { ResendSendResult } from "./resend";

export type NotificationConfig =
  | { mode: "disabled" }
  | SendNotificationConfig;

export interface SendNotificationConfig {
  mode: "send";
  apiKey: string;
  fromEmail: string;
  founderEmail: string;
  supportEmail: string;
}

const PLAIN_EMAIL = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
const DISPLAY_EMAIL = /^[^\r\n<>]{1,120}\s<([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>$/;

const required = (
  env: Record<string, string | undefined>,
  key: string,
): string => {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
};

const parsePlainEmail = (value: string, key: string): string => {
  if (value.length > 320 || !PLAIN_EMAIL.test(value)) {
    throw new Error(`${key} must be a valid email address`);
  }
  return value;
};

export function parseNotificationConfig(
  env: Record<string, string | undefined>,
): NotificationConfig {
  const mode = env.NOTIFICATION_MODE?.trim();
  if (mode === "disabled") return { mode: "disabled" };
  if (mode !== "send") {
    throw new Error("NOTIFICATION_MODE must be send or disabled");
  }
  const apiKey = required(env, "RESEND_API_KEY");
  if (apiKey.length > 255 || !/^re_[A-Za-z0-9_-]+$/.test(apiKey)) {
    throw new Error("RESEND_API_KEY is invalid");
  }
  const fromEmail = required(env, "RESEND_FROM_EMAIL");
  if (
    fromEmail.length > 320 ||
    fromEmail.includes("\r") ||
    fromEmail.includes("\n") ||
    (!PLAIN_EMAIL.test(fromEmail) && !DISPLAY_EMAIL.test(fromEmail))
  ) {
    throw new Error("RESEND_FROM_EMAIL must be a valid sender");
  }
  return {
    mode: "send",
    apiKey,
    fromEmail,
    founderEmail: parsePlainEmail(
      required(env, "FOUNDER_NOTIFICATION_EMAIL"),
      "FOUNDER_NOTIFICATION_EMAIL",
    ),
    supportEmail: parsePlainEmail(
      required(env, "SUPPORT_EMAIL"),
      "SUPPORT_EMAIL",
    ),
  };
}

export interface NotificationJobSpec {
  kind: NotificationKind;
  recipientRole: NotificationRecipientRole;
}

export function notificationJobsForEventFact(
  fact: StripeEventInput["eventFact"],
): readonly NotificationJobSpec[] {
  switch (fact) {
    case "deposit_paid":
      return [
        { kind: "founder_deposit_paid", recipientRole: "founder" },
        { kind: "client_deposit_paid", recipientRole: "client" },
      ];
    case "late_payment":
      return [{ kind: "founder_payment_alert", recipientRole: "founder" }];
    case "payment_mismatch":
    case "full_refund":
    case "partial_refund":
    case "dispute_created":
    case "dispute_closed":
      return [{ kind: "founder_payment_alert", recipientRole: "founder" }];
  }
}

export const buildNotificationIdempotencyKey = (
  eventId: string,
  kind: NotificationKind,
  recipientRole: NotificationRecipientRole,
): string =>
  `zhiji:${kind}:${recipientRole}:${createHash("sha256").update(eventId).digest("hex")}`;

export interface ClaimedNotificationJob {
  id: string;
  applicationId: string;
  stripeEventId: string | null;
  applicationEventId: string | null;
  eventFact: StripeEventInput["eventFact"] | null;
  eventOccurredAt: Date;
  lifecycleState: ApplicationState;
  depositAmount: number;
  currency: string;
  cohortVersion: string;
  country: string | null;
  region: string | null;
  notificationKind: NotificationKind;
  recipientRole: NotificationRecipientRole;
  idempotencyKey: string;
  attemptCount: number;
  leaseToken: string;
  clientEmail: string | null;
  frozenPayload: {
    from: string;
    to: string;
    subject: string;
    text: string;
    hash: string;
  } | null;
}

export interface NotificationMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}

export interface FrozenNotificationPayloadResult {
  message: NotificationMessage;
  hash: string;
  mismatch: boolean;
  integrityMismatch?: boolean;
}

export const hashNotificationPayload = (message: NotificationMessage): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      }),
    )
    .digest("hex");

export function resolveFrozenNotificationPayload(
  existing: NotificationMessage | null,
  candidate: NotificationMessage,
  storedHash?: string,
): FrozenNotificationPayloadResult {
  if (!existing) {
    return {
      message: candidate,
      hash: hashNotificationPayload(candidate),
      mismatch: false,
    };
  }
  const hash = hashNotificationPayload(existing);
  return {
    message: existing,
    hash,
    mismatch: hash !== hashNotificationPayload(candidate),
    integrityMismatch: storedHash !== undefined && storedHash !== hash,
  };
}

export function buildNotificationMessage(
  job: ClaimedNotificationJob,
  config: SendNotificationConfig,
): NotificationMessage {
  const occurredAt = job.eventOccurredAt.toISOString();
  const amount = `${job.currency.toUpperCase()} ${(job.depositAmount / 100).toFixed(2)}`;
  if (job.recipientRole === "client") {
    if (!job.clientEmail) throw new Error("Notification recipient unavailable");
    return {
      from: config.fromEmail,
      to: job.clientEmail,
      subject: "Zhiji · Calibration deposit received",
      text: [
        "Zhiji deposit confirmation",
        `Case: ${job.applicationId}`,
        `Event state: ${job.lifecycleState}`,
        `Amount: ${amount}`,
        `This payment event was recorded at ${occurredAt}.`,
        "For the latest case status or any changes, contact support.",
        `Questions: ${config.supportEmail}`,
      ].join("\n"),
      idempotencyKey: job.idempotencyKey,
    };
  }

  const application = job.notificationKind === "founder_application_received";
  const alert = job.notificationKind === "founder_payment_alert";
  return {
    from: config.fromEmail,
    to: config.founderEmail,
    subject: alert
      ? `Zhiji · Payment alert · ${job.applicationId}`
      : application
        ? `Zhiji · Application received · ${job.applicationId}`
        : job.lifecycleState === "deposit_paid"
          ? `Zhiji · Deposit paid · ${job.applicationId}`
          : `Zhiji · Case state update · ${job.applicationId}`,
    text: [
      application ? "Zhiji application notification" : "Zhiji payment notification",
      `Case: ${job.applicationId}`,
      `Event state: ${job.lifecycleState}`,
      `Amount: ${amount}`,
      `Cohort: ${job.cohortVersion}`,
      ...(application && job.country && job.region
        ? [`Location: ${job.country} / ${job.region}`]
        : []),
      ...(job.eventFact ? [`Event: ${job.eventFact}`] : []),
      `Recorded: ${occurredAt}`,
      "Next step: Inspect the latest secure record in the secure Supabase/CLI workspace before action.",
    ].join("\n"),
    idempotencyKey: job.idempotencyKey,
  };
}

export interface NotificationDeliveryDependencies {
  claimJobs: (eventId: string) => Promise<ClaimedNotificationJob[]>;
  freezePayload: (
    jobId: string,
    attemptCount: number,
    leaseToken: string,
    candidate: NotificationMessage,
  ) => Promise<FrozenNotificationPayloadResult>;
  sendEmail: (
    config: SendNotificationConfig,
    message: NotificationMessage,
  ) => Promise<ResendSendResult>;
  markSent: (
    jobId: string,
    attemptCount: number,
    leaseToken: string,
    providerMessageId: string,
  ) => Promise<unknown>;
  markFailed: (
    jobId: string,
    errorCode: NotificationErrorCode,
    retryable: boolean,
    attemptCount: number,
    leaseToken: string,
  ) => Promise<unknown>;
  hasRetryableJobs: (eventId: string) => Promise<boolean>;
}

export interface DueNotificationDeliveryDependencies {
  claimJobs: (limit: number) => Promise<ClaimedNotificationJob[]>;
  freezePayload: NotificationDeliveryDependencies["freezePayload"];
  sendEmail: NotificationDeliveryDependencies["sendEmail"];
  markSent: NotificationDeliveryDependencies["markSent"];
  markFailed: NotificationDeliveryDependencies["markFailed"];
  hasRetryableJobs: () => Promise<boolean>;
}

const defaultDeliveryDependencies = async (
  source: "stripe" | "application",
): Promise<NotificationDeliveryDependencies> => {
  const [applications, resend] = await Promise.all([
    import("./applications"),
    import("./resend"),
  ]);
  return {
    claimJobs:
      source === "stripe"
        ? applications.claimNotificationJobs
        : applications.claimApplicationNotificationJobs,
    freezePayload: applications.freezeNotificationPayload,
    sendEmail: resend.sendResendEmail,
    markSent: applications.markNotificationSent,
    markFailed: applications.markNotificationFailed,
    hasRetryableJobs:
      source === "stripe"
        ? applications.hasRetryableNotificationJobs
        : applications.hasRetryableApplicationNotificationJobs,
  };
};

const defaultDueDeliveryDependencies = async (): Promise<DueNotificationDeliveryDependencies> => {
  const [applications, resend] = await Promise.all([
    import("./applications"),
    import("./resend"),
  ]);
  return {
    claimJobs: applications.claimDueNotificationJobs,
    freezePayload: applications.freezeNotificationPayload,
    sendEmail: resend.sendResendEmail,
    markSent: applications.markNotificationSent,
    markFailed: applications.markNotificationFailed,
    hasRetryableJobs: applications.hasRetryableDueNotificationJobs,
  };
};

type DeliveryCounts = { claimed: number; sent: number; failed: number };

const deliverClaimedJobs = async (
  jobs: ClaimedNotificationJob[],
  config: SendNotificationConfig,
  dependencies: Pick<
    DueNotificationDeliveryDependencies,
    "freezePayload" | "sendEmail" | "markSent" | "markFailed"
  >,
): Promise<DeliveryCounts> => {
  const counts: DeliveryCounts = { claimed: jobs.length, sent: 0, failed: 0 };
  for (const claimed of jobs) {
    if (claimed.recipientRole === "client" && claimed.clientEmail === null) {
      await dependencies.markFailed(
        claimed.id,
        "recipient_unavailable",
        false,
        claimed.attemptCount,
        claimed.leaseToken,
      );
      counts.failed += 1;
      continue;
    }
    const candidate = buildNotificationMessage(claimed, config);
    const frozen = await dependencies.freezePayload(
      claimed.id,
      claimed.attemptCount,
      claimed.leaseToken,
      candidate,
    );
    if (frozen.integrityMismatch) {
      await dependencies.markFailed(
        claimed.id,
        "invalid_request",
        false,
        claimed.attemptCount,
        claimed.leaseToken,
      );
      counts.failed += 1;
      continue;
    }
    const result = await dependencies.sendEmail(config, frozen.message);
    if (result.status === "sent") {
      await dependencies.markSent(
        claimed.id,
        claimed.attemptCount,
        claimed.leaseToken,
        result.providerMessageId,
      );
      counts.sent += 1;
    } else {
      await dependencies.markFailed(
        claimed.id,
        result.code,
        result.retryable,
        claimed.attemptCount,
        claimed.leaseToken,
      );
      counts.failed += 1;
    }
  }
  return counts;
};

const deliverNotificationJobs = async (
  source: "stripe" | "application",
  sourceId: string,
  config: NotificationConfig,
  dependencies?: Partial<NotificationDeliveryDependencies>,
): Promise<{ retryNeeded: boolean }> => {
  if (config.mode === "disabled") return { retryNeeded: true };
  const resolved: NotificationDeliveryDependencies = {
    ...(await defaultDeliveryDependencies(source)),
    ...dependencies,
  };
  const jobs = await resolved.claimJobs(sourceId);
  await deliverClaimedJobs(jobs, config, resolved);
  return { retryNeeded: await resolved.hasRetryableJobs(sourceId) };
};

export const deliverNotificationJobsForStripeEvent = (
  eventId: string,
  config: NotificationConfig,
  dependencies?: Partial<NotificationDeliveryDependencies>,
): Promise<{ retryNeeded: boolean }> =>
  deliverNotificationJobs("stripe", eventId, config, dependencies);

export const deliverNotificationJobsForApplication = (
  applicationId: string,
  config: NotificationConfig,
  dependencies?: Partial<NotificationDeliveryDependencies>,
): Promise<{ retryNeeded: boolean }> =>
  deliverNotificationJobs("application", applicationId, config, dependencies);

export type DueNotificationDeliveryResult = DeliveryCounts & {
  status: "disabled" | "processed";
  retryNeeded: boolean;
};

export async function deliverDueNotificationJobs(
  config: NotificationConfig,
  dependencies?: Partial<DueNotificationDeliveryDependencies>,
  limit = 10,
): Promise<DueNotificationDeliveryResult> {
  if (config.mode === "disabled") {
    return {
      status: "disabled",
      claimed: 0,
      sent: 0,
      failed: 0,
      retryNeeded: true,
    };
  }
  const resolved: DueNotificationDeliveryDependencies = {
    ...(await defaultDueDeliveryDependencies()),
    ...dependencies,
  };
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 10));
  const jobs = await resolved.claimJobs(safeLimit);
  const counts = await deliverClaimedJobs(jobs, config, resolved);
  return {
    status: "processed",
    ...counts,
    retryNeeded: await resolved.hasRetryableJobs(),
  };
}

export interface NotificationCronConfig {
  cronSecret: string;
  notifications: NotificationConfig;
}

type NotificationCronDependencies = {
  loadConfig: () => NotificationCronConfig;
  deliverDue: (
    config: NotificationConfig,
  ) => Promise<DueNotificationDeliveryResult>;
  logger?: NotificationCronSafeLogger;
  createCorrelationId?: () => string;
};

export type NotificationCronSafeErrorCode =
  | "notification_cron_config_invalid"
  | "notification_cron_delivery_failed";

export interface NotificationCronSafeLogEntry {
  correlationId: string;
  code: NotificationCronSafeErrorCode;
}

export type NotificationCronSafeLogger = (
  entry: NotificationCronSafeLogEntry,
) => void;

const defaultNotificationCronSafeLogger: NotificationCronSafeLogger = (entry) => {
  console.error(JSON.stringify({ event: "notification_cron_error", ...entry }));
};

const bearerMatches = (authorization: string | null, secret: string): boolean => {
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  const expectedHash = createHash("sha256").update(secret).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
};

const jsonNoStore = (
  body: Record<string, unknown>,
  status: number,
  correlationId?: string,
): Response =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(correlationId ? { "x-request-id": correlationId } : {}),
    },
  });

export const createNotificationCronHandler = (
  dependencies: NotificationCronDependencies,
) => async (request: Request): Promise<Response> => {
  const correlationId =
    dependencies.createCorrelationId?.() ?? randomUUID();
  const log = dependencies.logger ?? defaultNotificationCronSafeLogger;
  let config: NotificationCronConfig;
  try {
    config = dependencies.loadConfig();
  } catch {
    log({ correlationId, code: "notification_cron_config_invalid" });
    return jsonNoStore({ status: "unavailable" }, 503, correlationId);
  }
  if (!bearerMatches(request.headers.get("authorization"), config.cronSecret)) {
    return jsonNoStore({ status: "unauthorized" }, 401);
  }
  if (config.notifications.mode === "disabled") {
    return jsonNoStore({ status: "disabled" }, 503);
  }
  let result: DueNotificationDeliveryResult;
  try {
    result = await dependencies.deliverDue(config.notifications);
  } catch {
    log({ correlationId, code: "notification_cron_delivery_failed" });
    return jsonNoStore({ status: "unavailable" }, 503, correlationId);
  }
  const counts = {
    claimed: result.claimed,
    sent: result.sent,
    failed: result.failed,
  };
  return result.retryNeeded
    ? jsonNoStore({ status: "retry", ...counts }, 503)
    : jsonNoStore({ status: "processed", ...counts }, 200);
};
