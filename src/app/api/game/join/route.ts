import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { GameServiceError, getCurrentProfile, getGameSnapshot, joinPrivateLeague } from "@/lib/game-service";

export const dynamic = "force-dynamic";
const joinSchema = z.object({
  inviteCode: z.string().trim().min(6).max(20),
  businessName: z.string().trim().min(2).max(48),
}).strict();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) throw new GameServiceError("Enter a company name and a valid private-league code.", 400, parsed.error.flatten());
    const profile = await getCurrentProfile();
    await joinPrivateLeague(profile.profileId, parsed.data.inviteCode, parsed.data.businessName);
    const snapshot = await getGameSnapshot(profile.profileId);
    return Response.json({ ...snapshot, isAdmin: profile.role === "admin" || process.env.ARENA_ADMIN_MODE === "true" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
