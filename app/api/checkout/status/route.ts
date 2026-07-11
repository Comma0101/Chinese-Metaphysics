import { getApplicationByCheckoutSession } from "@/lib/server/applications";
import { createCheckoutStatusHandler } from "@/lib/server/payments";

export const runtime = "nodejs";

export const GET = createCheckoutStatusHandler({
  getApplicationByCheckoutSession,
});
