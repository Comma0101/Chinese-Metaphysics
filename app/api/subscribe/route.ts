import {
  createSubscribeHandler,
  loadNewsletterConfig,
  upsertSubscriber,
} from "@/lib/server/subscribers";

export const runtime = "nodejs";

export const POST = createSubscribeHandler({
  loadConfig: loadNewsletterConfig,
  upsertSubscriber,
});
