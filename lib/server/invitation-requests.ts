import "server-only";

import type { DatabaseClient } from "./db";
import { getDatabase } from "./db";

export interface InvitationRequestInput {
  email: string;
  lang: "zh" | "en";
  country: string;
  city: string | null;
  decisionType: string;
  decisionWindow: string;
  priceAcknowledged: boolean;
}

export async function insertInvitationRequest(
  input: InvitationRequestInput,
  sql: DatabaseClient = getDatabase(),
): Promise<void> {
  await sql`
    insert into invitation_requests (
      email, lang, country, city, decision_type, decision_window,
      price_acknowledged
    ) values (
      ${input.email}, ${input.lang}, ${input.country}, ${input.city},
      ${input.decisionType}, ${input.decisionWindow}, ${input.priceAcknowledged}
    )
    on conflict (email) do update set
      lang = excluded.lang,
      country = excluded.country,
      city = excluded.city,
      decision_type = excluded.decision_type,
      decision_window = excluded.decision_window,
      price_acknowledged = excluded.price_acknowledged,
      updated_at = now()
  `;
}

const MAX_BODY_BYTES = 4 * 1024;
const MAX_EMAIL = 254;
const MAX_CITY = 80;
const MAX_DECISION = 120;

const ALLOWED_FIELDS = new Set([
  "email",
  "lang",
  "country",
  "city",
  "decisionType",
  "decisionWindow",
  "priceAcknowledged",
]);

type ErrorCode =
  | "unsupported_content_type"
  | "payload_too_large"
  | "invalid_body"
  | "unknown_field"
  | "invalid_email"
  | "invalid_country"
  | "invalid_decision"
  | "invalid_window"
  | "missing_price_ack"
  | "service_unavailable";

const errorMessages: Record<"zh" | "en", Record<ErrorCode, string>> = {
  zh: {
    unsupported_content_type: "请使用 JSON 格式提交。",
    payload_too_large: "请求内容过大。",
    invalid_body: "无效的请求。",
    unknown_field: "请求包含不支持的字段。",
    invalid_email: "请填写有效邮箱。",
    invalid_country: "请选择所在国家。",
    invalid_decision: "请选择决定类型。",
    invalid_window: "请选择决定时间范围。",
    missing_price_ack: "请确认价格。",
    service_unavailable: "服务暂时不可用，请稍后重试。",
  },
  en: {
    unsupported_content_type: "Please submit JSON.",
    payload_too_large: "The request is too large.",
    invalid_body: "Invalid request.",
    unknown_field: "The request contains an unsupported field.",
    invalid_email: "Please enter a valid email address.",
    invalid_country: "Please select your country.",
    invalid_decision: "Please select a decision type.",
    invalid_window: "Please select a decision window.",
    missing_price_ack: "Please acknowledge the price.",
    service_unavailable: "Service temporarily unavailable. Please try again.",
  },
};

function errorResponse(code: ErrorCode, status: number, lang: "zh" | "en" = "zh") {
  return Response.json(
    { ok: false, code, error: errorMessages[lang][code] },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function handleInvitationRequest(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType?.toLowerCase() !== "application/json") {
    return errorResponse("unsupported_content_type", 415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse("payload_too_large", 413);
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return errorResponse("payload_too_large", 413);
    }
    body = JSON.parse(text);
  } catch {
    return errorResponse("invalid_body", 422);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse("invalid_body", 422);
  }

  const record = body as Record<string, unknown>;
  const lang: "zh" | "en" = record.lang === "en" ? "en" : "zh";

  if (Object.keys(record).some((f) => !ALLOWED_FIELDS.has(f))) {
    return errorResponse("unknown_field", 422, lang);
  }

  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  if (!email || email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse("invalid_email", 422, lang);
  }

  const country = typeof record.country === "string" ? record.country.trim() : "";
  if (!country || country.length > 4) {
    return errorResponse("invalid_country", 422, lang);
  }

  const city =
    typeof record.city === "string" && record.city.trim()
      ? record.city.trim().slice(0, MAX_CITY)
      : null;

  const decisionType = typeof record.decisionType === "string" ? record.decisionType.trim() : "";
  if (!decisionType || decisionType.length > MAX_DECISION) {
    return errorResponse("invalid_decision", 422, lang);
  }

  const decisionWindow = typeof record.decisionWindow === "string" ? record.decisionWindow.trim() : "";
  if (!decisionWindow || decisionWindow.length > MAX_DECISION) {
    return errorResponse("invalid_window", 422, lang);
  }

  if (record.priceAcknowledged !== true) {
    return errorResponse("missing_price_ack", 422, lang);
  }

  try {
    await insertInvitationRequest({
      email,
      lang,
      country,
      city,
      decisionType,
      decisionWindow,
      priceAcknowledged: true,
    });
  } catch (err) {
    console.error(JSON.stringify({ code: "invitation_request_persist_failed" }));
    return errorResponse("service_unavailable", 503, lang);
  }

  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
