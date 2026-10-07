import { apiErrorResponse } from "@/lib/api-error";
import { startSeasonSchema } from "@/lib/decision-validation";
import { GameServiceError, createNewSeason, getCurrentProfile, getGameSnapshot } from "@/lib/game-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = startSeasonSchema.safeParse(body);
    if (!parsed.success) throw new GameServiceError("Enter a company name and choose a valid season mode.", 400, parsed.error.flatten());
    const profile = await getCurrentProfile();
    const created = await createNewSeason(profile.profileId, parsed.data);
    const snapshot = await getGameSnapshot(profile.profileId);
    return Response.json({ ...snapshot, createdSeasonId: created.season.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
