import "server-only";

import Stripe from "stripe";

import {
  buildDepositCheckoutParams,
  normalizeStripeWebhookEvent,
  type CreatedCheckoutSession,
  type DepositCheckoutInput,
  type NormalizedStripeWebhookEvent,
} from "./payments";

const verifiedWebhookEvents = new WeakSet<object>();

export const isVerifiedStripeWebhookEvent = (
  event: NormalizedStripeWebhookEvent,
): boolean => verifiedWebhookEvents.has(event);

const stripeClient = (secretKey: string) =>
  new Stripe(secretKey, { timeout: 10_000, maxNetworkRetries: 2 });

export async function createDepositCheckoutSession(
  stripeSecretKey: string,
  input: DepositCheckoutInput,
  idempotencyKey: string,
): Promise<CreatedCheckoutSession> {
  const session = await stripeClient(stripeSecretKey).checkout.sessions.create(
    buildDepositCheckoutParams(input),
    { idempotencyKey },
  );
  return { id: session.id, url: session.url, status: session.status };
}

export async function retrieveDepositCheckoutSession(
  stripeSecretKey: string,
  sessionId: string,
): Promise<CreatedCheckoutSession> {
  const session = await stripeClient(stripeSecretKey).checkout.sessions.retrieve(
    sessionId,
  );
  return { id: session.id, url: session.url, status: session.status };
}

export function verifyStripeWebhookEvent(
  stripeSecretKey: string,
  webhookSecret: string,
  rawBody: Uint8Array,
  signature: string,
): NormalizedStripeWebhookEvent {
  const event = stripeClient(stripeSecretKey).webhooks.constructEvent(
    Buffer.from(rawBody),
    signature,
    webhookSecret,
  );
  const normalized = normalizeStripeWebhookEvent(event);
  if (normalized.kind !== "ignored") {
    verifiedWebhookEvents.add(normalized);
  }
  return normalized;
}
