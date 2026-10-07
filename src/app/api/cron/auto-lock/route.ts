import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { businesses, ceoProfiles, turns, users } from "@/db/schema";
import { apiErrorResponse } from "@/lib/api-error";
import { lockTurn, type CurrentProfile } from "@/lib/game-service";
import type { GameState } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Scheduled locking is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const due = await db.select({
      turnId: turns.id,
      turnNumber: turns.turnNumber,
      businessId: businesses.id,
      businessState: businesses.state,
      profileId: ceoProfiles.id,
      userId: users.id,
      role: users.role,
      displayName: ceoProfiles.displayName,
      avatar: ceoProfiles.avatar,
      country: ceoProfiles.country,
      persona: ceoProfiles.persona,
      xp: ceoProfiles.xp,
      level: ceoProfiles.level,
      activeTitle: ceoProfiles.activeTitle,
    })
      .from(turns)
      .innerJoin(businesses, eq(businesses.id, turns.businessId))
      .innerJoin(ceoProfiles, eq(ceoProfiles.id, businesses.ceoProfileId))
      .innerJoin(users, eq(users.id, ceoProfiles.userId))
      .where(and(eq(turns.status, "open"), lte(turns.deadline, new Date()), eq(businesses.status, "active")))
      .limit(100);
    const processed: { turnNumber: number; outcome: unknown }[] = [];
    for (const row of due) {
      const state = row.businessState as unknown as GameState;
      const profile: CurrentProfile = {
        userId: row.userId,
        profileId: row.profileId,
        role: row.role,
        displayName: row.displayName,
        avatar: row.avatar,
        country: row.country,
        persona: row.persona,
        xp: row.xp,
        level: row.level,
        activeTitle: row.activeTitle,
      };
      const result = await lockTurn(profile, row.turnNumber, state.previousDecisions);
      processed.push({ turnNumber: row.turnNumber, outcome: result.outcome ?? result.result?.outcome ?? null });
    }
    return Response.json({ ok: true, processed: processed.length, turns: processed });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// Vercel Cron Jobs call routes with GET and send "Authorization: Bearer $CRON_SECRET".
export const GET = POST;
