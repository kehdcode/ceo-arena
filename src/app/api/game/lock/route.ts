import { apiErrorResponse } from "@/lib/api-error";
import { lockRequestSchema } from "@/lib/decision-validation";
import { GameServiceError, getCurrentProfile, lockTurn } from "@/lib/game-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = lockRequestSchema.safeParse(body);
    if (!parsed.success) throw new GameServiceError("Check your decisions and try again.", 400, parsed.error.flatten());
    const profile = await getCurrentProfile();
    const result = await lockTurn(profile, parsed.data.turnNumber, parsed.data.decisions);
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
