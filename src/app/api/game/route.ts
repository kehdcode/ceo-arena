import { apiErrorResponse } from "@/lib/api-error";
import { getCurrentProfile, getGameSnapshot, lockTurn } from "@/lib/game-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    let snapshot = await getGameSnapshot(profile.profileId);
    const deadline = snapshot.currentTurn?.deadline ? new Date(snapshot.currentTurn.deadline).getTime() : 0;
    if (snapshot.season.mode !== "practice" && snapshot.currentTurn && snapshot.upcoming && deadline > 0 && deadline <= Date.now()) {
      await lockTurn(profile, snapshot.currentTurn.turnNumber, snapshot.upcoming.defaultDecisions);
      snapshot = await getGameSnapshot(profile.profileId);
    }
    return Response.json({ ...snapshot, isAdmin: profile.role === "admin" || process.env.ARENA_ADMIN_MODE === "true" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
