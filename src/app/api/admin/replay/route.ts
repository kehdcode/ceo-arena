import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ruleVersions, turns } from "@/db/schema";
import { apiErrorResponse } from "@/lib/api-error";
import { GameServiceError, getCurrentProfile } from "@/lib/game-service";
import { mergeConfig, simulateTurn, stableHash, type Decisions, type GameState } from "@/lib/engine";

export const dynamic = "force-dynamic";
const replaySchema = z.object({ turnId: z.string().uuid() }).strict();

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (profile.role !== "admin" && process.env.ARENA_ADMIN_MODE !== "true") throw new GameServiceError("Admin access is required.", 403);
    const body = await request.json().catch(() => null);
    const parsed = replaySchema.safeParse(body);
    if (!parsed.success) throw new GameServiceError("Enter a valid stored turn ID.", 400);
    const [turn] = await db.select().from(turns).where(eq(turns.id, parsed.data.turnId)).limit(1);
    if (!turn || turn.status !== "simulated" || !turn.inputState || !turn.decisions || !turn.outputState) {
      throw new GameServiceError("That simulated turn does not exist or is missing its replay snapshot.", 404);
    }
    const [rule] = await db.select().from(ruleVersions).where(eq(ruleVersions.id, turn.ruleVersionId)).limit(1);
    if (!rule) throw new GameServiceError("The stored rule version could not be found.", 404);
    const config = mergeConfig(rule.config);
    const state = turn.inputState as unknown as GameState;
    const decisions = turn.decisions as unknown as Decisions;
    const seed = { player: turn.seed, event: turn.eventSeed };
    const inputHash = stableHash({ state, decisions, seed, ruleVersion: rule.id, engineVersion: config.engineVersion });
    const result = simulateTurn(state, decisions, config, seed);
    const outputHash = stableHash({ nextState: result.nextState, outcome: result.outcome, events: result.events, explanations: result.explanations });
    return Response.json({
      turnId: turn.id,
      turnNumber: turn.turnNumber,
      ruleVersion: rule.label,
      inputMatches: inputHash === turn.inputHash,
      outputMatches: outputHash === turn.outputHash,
      inputHash,
      storedInputHash: turn.inputHash,
      outputHash,
      storedOutputHash: turn.outputHash,
      score: result.outcome.score,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
