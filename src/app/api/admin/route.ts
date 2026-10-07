import { apiErrorResponse } from "@/lib/api-error";
import { rulePatchSchema } from "@/lib/decision-validation";
import { GameServiceError, getAdminSummary, getCurrentProfile, saveRuleConfig } from "@/lib/game-service";
import type { SimulationConfig } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    return Response.json(await getAdminSummary(profile));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = rulePatchSchema.safeParse(body);
    if (!parsed.success) throw new GameServiceError("Review the simulation settings and try again.", 400, parsed.error.flatten());
    const profile = await getCurrentProfile();
    const rule = await saveRuleConfig(profile, parsed.data as Partial<SimulationConfig>);
    return Response.json({ ok: true, rule });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
