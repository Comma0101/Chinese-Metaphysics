import { applyStripeEvent } from "@/lib/server/applications";
import { deliverNotificationJobsForStripeEvent } from "@/lib/server/notifications";
import { createStripeWebhookHandler } from "@/lib/server/payments";
import {
  loadNotificationConfig,
  loadStripeWebhookConfig,
} from "@/lib/server/runtime-config";
import { sendResendEmail } from "@/lib/server/resend";
import { verifyStripeWebhookEvent } from "@/lib/server/stripe";

export const runtime = "nodejs";

export const POST = createStripeWebhookHandler({
  loadConfig: loadStripeWebhookConfig,
  verifyEvent: verifyStripeWebhookEvent,
  applyEvent: applyStripeEvent,
  deliverNotifications: (eventId) =>
    deliverNotificationJobsForStripeEvent(eventId, loadNotificationConfig(), {
      sendEmail: sendResendEmail,
    }),
});
