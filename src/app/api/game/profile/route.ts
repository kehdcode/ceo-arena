import { apiErrorResponse } from "@/lib/api-error";
import { profileSchema } from "@/lib/decision-validation";
import { GameServiceError, getCurrentProfile, getGameSnapshot, updateProfile } from "@/lib/game-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) throw new GameServiceError("Check your CEO profile details.", 400, parsed.error.flatten());
    const profile = await getCurrentProfile();
    await updateProfile(profile.profileId, parsed.data);
    const snapshot = await getGameSnapshot(profile.profileId);
    return Response.json({ ...snapshot, isAdmin: profile.role === "admin" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
