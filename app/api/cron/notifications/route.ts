import {
  createNotificationCronHandler,
  deliverDueNotificationJobs,
} from "@/lib/server/notifications";
import { loadNotificationCronConfig } from "@/lib/server/runtime-config";

export const dynamic = "force-dynamic";

export const GET = createNotificationCronHandler({
  loadConfig: loadNotificationCronConfig,
  deliverDue: deliverDueNotificationJobs,
});
