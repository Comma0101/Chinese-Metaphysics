import "server-only";

import { parsePilotConfig } from "./config";
import {
  parseNotificationConfig,
  type NotificationCronConfig,
  type NotificationConfig,
} from "./notifications";
import type { StripeWebhookConfig } from "./payments";

export const loadNotificationConfig = (): NotificationConfig =>
  parseNotificationConfig(process.env);

const loadCronSecret = (): string => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16 || secret.length > 255) {
    throw new Error("CRON_SECRET must be between 16 and 255 characters");
  }
  return secret;
};

export const loadNotificationCronConfig = (): NotificationCronConfig => ({
  cronSecret: loadCronSecret(),
  notifications: loadNotificationConfig(),
});

export const loadPilotConfig = () => {
  const config = parsePilotConfig(process.env);
  if (config.enabled) {
    const notifications = parseNotificationConfig(process.env);
    if (notifications.mode !== "send") {
      throw new Error("NOTIFICATION_MODE must be send when paid pilot is enabled");
    }
    loadCronSecret();
    loadStripeWebhookConfig();
  }
  return config;
};

export const loadStripeWebhookConfig = (): StripeWebhookConfig => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is required");
  if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required");
  }
  return { stripeSecretKey, webhookSecret };
};
