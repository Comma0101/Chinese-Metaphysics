import {
  createApplication,
  transitionApplication,
} from "@/lib/server/applications";
import { loadPilotConfig } from "@/lib/server/runtime-config";
import {
  createCheckoutPostHandler,
} from "@/lib/server/payments";
import {
  createDepositCheckoutSession,
  retrieveDepositCheckoutSession,
} from "@/lib/server/stripe";

export const runtime = "nodejs";

export const POST = createCheckoutPostHandler({
  loadConfig: loadPilotConfig,
  createApplication,
  transitionApplication,
  createCheckoutSession: createDepositCheckoutSession,
  retrieveCheckoutSession: retrieveDepositCheckoutSession,
});
