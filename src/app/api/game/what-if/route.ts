import { apiErrorResponse } from "@/lib/api-error";
import { decisionsSchema } from "@/lib/decision-validation";
import { GameServiceError, getCurrentProfile, runWhatIf } from "@/lib/game-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") throw new GameServiceError("A complete decision set is required.", 400);
    const payload = body as { turnNumber?: unknown; decisions?: unknown };
    const turnNumber = Number(payload.turnNumber);
    if (!Number.isInteger(turnNumber) || turnNumber < 1 || turnNumber > 12) throw new GameServiceError("Choose the current month to run a projection.", 400);
    const parsed = decisionsSchema.safeParse(payload.decisions);
    if (!parsed.success) throw new GameServiceError("Check the projected decisions and try again.", 400, parsed.error.flatten());
    const profile = await getCurrentProfile();
    const result = await runWhatIf(profile, turnNumber, parsed.data);
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
