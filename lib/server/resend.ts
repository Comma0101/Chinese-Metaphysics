import "server-only";

import type {
  NotificationMessage,
  SendNotificationConfig,
} from "./notifications";
import type { NotificationErrorCode } from "./applications";

export type ResendSendResult =
  | { status: "sent"; providerMessageId: string }
  | {
      status: "failed";
      code: Exclude<NotificationErrorCode, "recipient_unavailable">;
      retryable: boolean;
    };

type Fetch = typeof fetch;
const PROVIDER_ID = /^[A-Za-z0-9_-]{1,255}$/;
const MAX_CONFLICT_BODY_BYTES = 1_024;

const readConflictName = async (response: Response): Promise<string | null> => {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_CONFLICT_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
      name?: unknown;
    };
    return typeof parsed?.name === "string" && parsed.name.length <= 80
      ? parsed.name
      : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
};

export async function sendResendEmail(
  config: SendNotificationConfig,
  message: NotificationMessage,
  fetchImpl: Fetch = fetch,
): Promise<ResendSendResult> {
  if (
    message.idempotencyKey.length > 256 ||
    !/^[A-Za-z0-9:._-]+$/.test(message.idempotencyKey)
  ) {
    return { status: "failed", code: "invalid_request", retryable: false };
  }
  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      const body = (await response.json().catch(() => null)) as {
        id?: unknown;
      } | null;
      return typeof body?.id === "string" && PROVIDER_ID.test(body.id)
        ? { status: "sent", providerMessageId: body.id }
        : { status: "failed", code: "provider_unavailable", retryable: true };
    }
    if (response.status === 429) {
      return { status: "failed", code: "rate_limited", retryable: true };
    }
    if (response.status === 409) {
      const name = await readConflictName(response);
      if (name === "concurrent_idempotent_requests") {
        return { status: "failed", code: "concurrent_request", retryable: true };
      }
      if (name === "invalid_idempotent_request") {
        return { status: "failed", code: "invalid_request", retryable: false };
      }
      return { status: "failed", code: "provider_unavailable", retryable: true };
    }
    if (response.status === 408) {
      return { status: "failed", code: "timeout", retryable: true };
    }
    if (response.status >= 500) {
      return { status: "failed", code: "provider_unavailable", retryable: true };
    }
    return { status: "failed", code: "invalid_request", retryable: false };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return name === "AbortError" || name === "TimeoutError"
      ? { status: "failed", code: "timeout", retryable: true }
      : { status: "failed", code: "provider_unavailable", retryable: true };
  }
}
