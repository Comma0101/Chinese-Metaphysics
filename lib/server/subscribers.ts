import "server-only";

import { randomUUID } from "node:crypto";

import type { DatabaseClient } from "./db";
import { getDatabase } from "./db";

export type SubscriberLanguage = "zh" | "en";
export const NEWSLETTER_MARKETING_CONSENT_VERSION = "2026-07-10";

export interface SubscriberInput {
  email: string;
  lang: SubscriberLanguage;
  marketingConsent: boolean;
  consentVersion: string | null;
}

interface SubscribeDependencies {
  loadConfig: () => NewsletterConfig;
  upsertSubscriber: (input: SubscriberInput) => Promise<unknown>;
  logger?: (entry: NewsletterSafeLogEntry) => void;
  createCorrelationId?: () => string;
}

export interface NewsletterSafeLogEntry {
  correlationId: string;
  code: "newsletter_persist_failed";
}

const defaultSafeLogger = (entry: NewsletterSafeLogEntry): void => {
  console.error(JSON.stringify(entry));
};

export interface NewsletterConfig {
  enabled: boolean;
}

export function parseNewsletterConfig(
  env: Record<string, string | undefined>,
): NewsletterConfig {
  const value = env.NEWSLETTER_ENABLED;
  if (value === undefined || value === "false") return { enabled: false };
  if (value === "true") return { enabled: true };
  throw new Error("NEWSLETTER_ENABLED must be true or false");
}

export const loadNewsletterConfig = (): NewsletterConfig =>
  parseNewsletterConfig(process.env);

export async function upsertSubscriber(
  input: SubscriberInput,
  sql: DatabaseClient = getDatabase(),
): Promise<void> {
  await sql`
    insert into subscribers (
      email, lang, marketing_consent, consent_version, consented_at
    ) values (
      ${input.email}, ${input.lang}, ${input.marketingConsent},
      ${input.consentVersion},
      ${input.marketingConsent ? new Date() : null}
    )
    on conflict (email) do update set
      lang = excluded.lang,
      marketing_consent = subscribers.marketing_consent or (
        excluded.marketing_consent and subscribers.unsubscribed_at is null
      ),
      consent_version = case
        when excluded.marketing_consent and subscribers.unsubscribed_at is null
          then excluded.consent_version
        else subscribers.consent_version
      end,
      consented_at = case
        when excluded.marketing_consent
          and subscribers.unsubscribed_at is null
          and (
            not subscribers.marketing_consent
            or subscribers.consent_version is distinct from excluded.consent_version
          )
          then excluded.consented_at
        else subscribers.consented_at
      end
  `;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const MAX_SUBSCRIPTION_BODY_BYTES = 4 * 1024;
const ALLOWED_FIELDS = new Set([
  "email",
  "lang",
  "marketingConsent",
  "consentVersion",
]);

type SubscribeErrorCode =
  | "unsupported_content_type"
  | "payload_too_large"
  | "invalid_body"
  | "unknown_field"
  | "invalid_email"
  | "invalid_language"
  | "invalid_consent"
  | "subscription_unavailable";

const errorMessages: Record<SubscriberLanguage, Record<SubscribeErrorCode, string>> = {
  zh: {
    unsupported_content_type: "请使用 JSON 格式提交。",
    payload_too_large: "请求内容过大。",
    invalid_body: "无效的请求。",
    unknown_field: "请求包含不支持的字段。",
    invalid_email: "请填写有效邮箱。",
    invalid_language: "请选择中文或英文。",
    invalid_consent: "请重新确认邮件同意选项。",
    subscription_unavailable: "邮件订阅暂时不可用。",
  },
  en: {
    unsupported_content_type: "Please submit JSON.",
    payload_too_large: "The request is too large.",
    invalid_body: "Invalid request.",
    unknown_field: "The request contains an unsupported field.",
    invalid_email: "Please enter a valid email address.",
    invalid_language: "Please choose Chinese or English.",
    invalid_consent: "Please confirm the email consent option again.",
    subscription_unavailable: "Subscription is temporarily unavailable.",
  },
};

const errorResponse = (
  code: SubscribeErrorCode,
  status: 413 | 415 | 422 | 503,
  lang: SubscriberLanguage = "zh",
) =>
  Response.json(
    { ok: false, code, error: errorMessages[lang][code] },
    { status, headers: { "cache-control": "no-store" } },
  );

async function readBody(
  request: Request,
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; code: SubscribeErrorCode; status: 413 | 415 | 422 }
> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType?.toLowerCase() !== "application/json") {
    return { ok: false, code: "unsupported_content_type", status: 415 };
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SUBSCRIPTION_BODY_BYTES) {
    return { ok: false, code: "payload_too_large", status: 413 };
  }

  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_SUBSCRIPTION_BODY_BYTES) {
          await reader.cancel().catch(() => undefined);
          return { ok: false, code: "payload_too_large", status: 413 };
        }
        chunks.push(value);
      }
    } catch {
      await reader.cancel().catch(() => undefined);
      return { ok: false, code: "invalid_body", status: 422 };
    } finally {
      reader.releaseLock();
    }
  }

  try {
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      ok: true,
      value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    };
  } catch {
    return { ok: false, code: "invalid_body", status: 422 };
  }
}

function parseSubscriber(value: unknown):
  | { ok: true; input: SubscriberInput }
  | { ok: false; code: SubscribeErrorCode; lang: SubscriberLanguage } {
  if (!isRecord(value)) {
    return { ok: false, code: "invalid_body", lang: "zh" };
  }
  const lang: SubscriberLanguage = value.lang === "en" ? "en" : "zh";
  if (Object.keys(value).some((field) => !ALLOWED_FIELDS.has(field))) {
    return { ok: false, code: "unknown_field", lang };
  }
  if (value.lang !== "zh" && value.lang !== "en") {
    return { ok: false, code: "invalid_language", lang };
  }
  if (
    typeof value.email !== "string" ||
    value.email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())
  ) {
    return { ok: false, code: "invalid_email", lang };
  }
  if (
    value.marketingConsent !== undefined &&
    typeof value.marketingConsent !== "boolean"
  ) {
    return { ok: false, code: "invalid_consent", lang };
  }
  const marketingConsent = value.marketingConsent === true;
  if (
    (marketingConsent &&
      value.consentVersion !== NEWSLETTER_MARKETING_CONSENT_VERSION) ||
    (!marketingConsent && value.consentVersion !== undefined)
  ) {
    return { ok: false, code: "invalid_consent", lang };
  }
  return {
    ok: true,
    input: {
      email: value.email.trim().toLowerCase(),
      lang,
      marketingConsent,
      consentVersion: marketingConsent
        ? NEWSLETTER_MARKETING_CONSENT_VERSION
        : null,
    },
  };
}

export function createSubscribeHandler(
  dependencies: SubscribeDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    let config: NewsletterConfig;
    try {
      config = dependencies.loadConfig();
    } catch {
      config = { enabled: false };
    }
    if (!config.enabled) {
      return Response.json(
        {
          ok: false,
          code: "newsletter_disabled",
          error: "Email collection is currently disabled.",
        },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }
    const body = await readBody(request);
    if (!body.ok) {
      return errorResponse(body.code, body.status);
    }
    const parsed = parseSubscriber(body.value);
    if (!parsed.ok) {
      return errorResponse(parsed.code, 422, parsed.lang);
    }
    const correlationId = dependencies.createCorrelationId?.() ?? randomUUID();
    try {
      await dependencies.upsertSubscriber(parsed.input);
    } catch {
      (dependencies.logger ?? defaultSafeLogger)({
        correlationId,
        code: "newsletter_persist_failed",
      });
      const response = errorResponse(
        "subscription_unavailable",
        503,
        parsed.input.lang,
      );
      response.headers.set("x-request-id", correlationId);
      return response;
    }
    return Response.json(
      { ok: true },
      { headers: { "cache-control": "no-store" } },
    );
  };
}
