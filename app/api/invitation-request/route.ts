import { handleInvitationRequest } from "@/lib/server/invitation-requests";

export const runtime = "nodejs";

export const POST = handleInvitationRequest;
