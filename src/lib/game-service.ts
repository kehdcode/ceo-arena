import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  achievements,
  aiOutputs,
  auditLogs,
  businesses,
  ceoProfiles,
  marketEvents,
  ruleVersions,
  scores,
  seasons,
  turns,
  userAchievements,
  users,
  whatIfRuns,
} from "@/db/schema";
import {
  carryForwardDecisions,
  createStartingState,
  DEFAULT_CONFIG,
  DEFAULT_DECISIONS,
  hashSeed,
  mergeConfig,
  simulateTurn,
  stableHash,
  type Decisions,
  type GameState,
  type SimulationConfig,
  type SimulationResult,
} from "@/lib/engine";

const SESSION_COOKIE = "ceo_arena_session";
const PRACTICE_SEED = hashSeed("ceo-arena-lagos-fashion-season-v1");

const ACHIEVEMENT_DEFINITIONS = [
  { key: "first_turn", name: "First Month", description: "Lock your first CEO decision set.", icon: "🚀", xpReward: 75 },
  { key: "first_profit", name: "First Profit", description: "Record a positive operating profit in a month.", icon: "📈", xpReward: 100 },
  { key: "zero_stockouts", name: "Smooth Operator", description: "Complete three consecutive months without stockouts.", icon: "📦", xpReward: 150 },
  { key: "growth_hacker", name: "Growth Hacker", description: "Grow your active customer base to 1,800 or more.", icon: "⚡", xpReward: 200 },
  { key: "crisis_survivor", name: "Crisis Survivor", description: "Stay profitable through a month with a market event.", icon: "🛡️", xpReward: 150 },
  { key: "season_finisher", name: "Season Finisher", description: "Complete all 12 months of a season.", icon: "🏆", xpReward: 500 },
] as const;

export interface CurrentProfile {
  userId: string;
  profileId: string;
  role: string;
  displayName: string;
  avatar: string;
  country: string;
  persona: string;
  xp: number;
  level: number;
  activeTitle: string | null;
}

export class GameServiceError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "GameServiceError";
    this.status = status;
    this.details = details;
  }
}

export async function getCurrentProfile(): Promise<CurrentProfile> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    const existing = await db
      .select({
        userId: users.id,
        role: users.role,
        profileId: ceoProfiles.id,
        displayName: ceoProfiles.displayName,
        avatar: ceoProfiles.avatar,
        country: ceoProfiles.country,
        persona: ceoProfiles.persona,
        xp: ceoProfiles.xp,
        level: ceoProfiles.level,
        activeTitle: ceoProfiles.activeTitle,
      })
      .from(users)
      .innerJoin(ceoProfiles, eq(ceoProfiles.userId, users.id))
      .where(eq(users.id, sessionId))
      .limit(1);
    if (existing[0]) return existing[0];
  }

  const identity = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      email: `ceo-${randomUUID()}@arena.local`,
      role: process.env.ARENA_ADMIN_MODE === "true" ? "admin" : "player",
    }).returning();
    const [profile] = await tx.insert(ceoProfiles).values({
      userId: user.id,
      displayName: "Kemi Okafor",
      avatar: "✦",
      country: "NG",
      persona: "founder",
    }).returning();
    return { user, profile };
  });

  cookieStore.set(SESSION_COOKIE, identity.user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return {
    userId: identity.user.id,
    profileId: identity.profile.id,
    role: identity.user.role,
    displayName: identity.profile.displayName,
    avatar: identity.profile.avatar,
    country: identity.profile.country,
    persona: identity.profile.persona,
    xp: identity.profile.xp,
    level: identity.profile.level,
    activeTitle: identity.profile.activeTitle,
  };
}

async function getOrCreateRuleVersion() {
  const published = await db.select().from(ruleVersions)
    .where(eq(ruleVersions.status, "published"))
    .orderBy(desc(ruleVersions.createdAt))
    .limit(1);
  if (published[0]) return published[0];
  const [rule] = await db.insert(ruleVersions).values({
    label: "Lagos Fashion • Rules 1.0",
    engineVersion: DEFAULT_CONFIG.engineVersion,
    config: DEFAULT_CONFIG as unknown as Record<string, unknown>,
    status: "published",
  }).returning();
  return rule;
}

async function ensureAchievementDefinitions() {
  await db.insert(achievements).values(ACHIEVEMENT_DEFINITIONS.map((achievement) => ({ ...achievement })))
    .onConflictDoNothing();
}

function scheduledDeadline(mode: string): Date | null {
  if (mode === "practice") return null;
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

async function insertOpenTurn(
  businessId: string,
  seasonId: string,
  ruleVersionId: string,
  seasonSeed: number,
  turnNumber: number,
  mode: string,
) {
  return db.insert(turns).values({
    businessId,
    turnNumber,
    status: "open",
    deadline: scheduledDeadline(mode),
    seed: hashSeed(`${seasonSeed}:${businessId}:player:${turnNumber}`),
    eventSeed: hashSeed(`${seasonSeed}:market-event:${turnNumber}`),
    ruleVersionId,
  }).onConflictDoNothing().returning();
}

export async function createNewSeason(
  profileId: string,
  options: { businessName?: string; mode?: string; brandColor?: string } = {},
) {
  const mode = options.mode ?? "practice";
  if (!["practice", "ranked", "private"].includes(mode)) {
    throw new GameServiceError("Choose Practice, Ranked Season, or Private League.", 400);
  }
  const name = (options.businessName ?? "Threadline Lagos").trim().slice(0, 48) || "Threadline Lagos";
  const brandColor = /^#[0-9a-fA-F]{6}$/.test(options.brandColor ?? "") ? options.brandColor! : "#c8ff55";
  await ensureAchievementDefinitions();
  const rule = await getOrCreateRuleVersion();
  const config = mergeConfig(rule.config);
  const state = createStartingState(config);
  const seasonSeed = mode === "practice" ? PRACTICE_SEED : hashSeed("ceo-arena-ranked-lagos-fashion-v1");
  const inviteCode = mode === "private" ? `ARENA-${randomUUID().slice(0, 6).toUpperCase()}` : null;

  const result = await db.transaction(async (tx) => {
    const previous = await tx.select().from(businesses)
      .where(and(eq(businesses.ceoProfileId, profileId), eq(businesses.status, "active")))
      .orderBy(desc(businesses.createdAt));
    for (const oldBusiness of previous) {
      await tx.update(businesses).set({ status: "archived" }).where(eq(businesses.id, oldBusiness.id));
      const [oldSeason] = await tx.select({ mode: seasons.mode }).from(seasons).where(eq(seasons.id, oldBusiness.seasonId)).limit(1);
      if (oldSeason?.mode === "practice") await tx.update(seasons).set({ status: "completed" }).where(eq(seasons.id, oldBusiness.seasonId));
    }
    const [season] = await tx.insert(seasons).values({
      name: mode === "private" ? `${name} • Private League` : mode === "ranked" ? "Lagos Fashion League • Season 01" : "Open Practice • Lagos Fashion",
      mode,
      ruleVersionId: rule.id,
      startingConditions: state as unknown as Record<string, unknown>,
      seed: seasonSeed,
      turnCount: 12,
      turnSchedule: mode === "practice" ? { type: "self-paced" } : { type: "daily", hoursPerTurn: 24 },
      status: "published",
      inviteCode,
    }).returning();
    const [business] = await tx.insert(businesses).values({
      seasonId: season.id,
      ceoProfileId: profileId,
      name,
      archetype: "lagos-fashion-ecommerce",
      brandColor,
      state: state as unknown as Record<string, unknown>,
      status: "active",
    }).returning();
    await tx.insert(turns).values({
      businessId: business.id,
      turnNumber: 1,
      status: "open",
      deadline: scheduledDeadline(mode),
      seed: hashSeed(`${seasonSeed}:${business.id}:player:1`),
      eventSeed: hashSeed(`${seasonSeed}:market-event:1`),
      ruleVersionId: rule.id,
    });
    return { season, business };
  });
  return result;
}

export async function joinPrivateLeague(profileId: string, inviteCode: string, businessName: string) {
  const code = inviteCode.trim().toUpperCase();
  if (!/^[A-Z0-9-]{6,20}$/.test(code)) throw new GameServiceError("Enter a valid private-league invite code.", 400);
  const [season] = await db.select().from(seasons)
    .where(and(eq(seasons.inviteCode, code), eq(seasons.mode, "private"), eq(seasons.status, "published")))
    .limit(1);
  if (!season) throw new GameServiceError("That private league code is invalid or the season has closed.", 404);
  const existingMembership = await db.select({ id: businesses.id }).from(businesses)
    .where(and(eq(businesses.seasonId, season.id), eq(businesses.ceoProfileId, profileId))).limit(1);
  if (existingMembership[0]) throw new GameServiceError("You already have a company in this private league.", 409);
  const [rule] = await db.select().from(ruleVersions).where(eq(ruleVersions.id, season.ruleVersionId)).limit(1);
  if (!rule) throw new GameServiceError("This league’s rule version is unavailable.", 404);
  const state = createStartingState(mergeConfig(rule.config));
  const name = businessName.trim().slice(0, 48) || "Threadline Lagos";
  await db.transaction(async (tx) => {
    const previous = await tx.select().from(businesses)
      .where(and(eq(businesses.ceoProfileId, profileId), eq(businesses.status, "active")));
    for (const oldBusiness of previous) {
      await tx.update(businesses).set({ status: "archived" }).where(eq(businesses.id, oldBusiness.id));
      const [oldSeason] = await tx.select({ mode: seasons.mode }).from(seasons).where(eq(seasons.id, oldBusiness.seasonId)).limit(1);
      if (oldSeason?.mode === "practice") await tx.update(seasons).set({ status: "completed" }).where(eq(seasons.id, oldBusiness.seasonId));
    }
    const [business] = await tx.insert(businesses).values({
      seasonId: season.id,
      ceoProfileId: profileId,
      name,
      archetype: "lagos-fashion-ecommerce",
      state: state as unknown as Record<string, unknown>,
      status: "active",
    }).returning();
    await tx.insert(turns).values({
      businessId: business.id,
      turnNumber: 1,
      status: "open",
      deadline: scheduledDeadline("private"),
      seed: hashSeed(`${season.seed}:${business.id}:player:1`),
      eventSeed: hashSeed(`${season.seed}:market-event:1`),
      ruleVersionId: rule.id,
    });
  });
  return { seasonId: season.id, inviteCode: code };
}

async function getLatestBusiness(profileId: string) {
  const rows = await db.select().from(businesses)
    .where(eq(businesses.ceoProfileId, profileId))
    .orderBy(desc(businesses.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

async function getBusinessContext(profileId: string) {
  let business = await getLatestBusiness(profileId);
  if (!business) {
    await createNewSeason(profileId, { businessName: "Threadline Lagos", mode: "practice" });
    business = await getLatestBusiness(profileId);
  }
  if (!business) throw new GameServiceError("We could not create your first business. Try again.", 500);

  const [season] = await db.select().from(seasons).where(eq(seasons.id, business.seasonId)).limit(1);
  if (!season) throw new GameServiceError("This season is no longer available.", 404);
  const [rule] = await db.select().from(ruleVersions).where(eq(ruleVersions.id, season.ruleVersionId)).limit(1);
  const config = mergeConfig(rule?.config);
  const state = business.state as unknown as GameState;
  const nextTurnNumber = state.month + 1;
  const existingTurn = await db.select().from(turns)
    .where(and(eq(turns.businessId, business.id), eq(turns.turnNumber, nextTurnNumber)))
    .limit(1);
  let currentTurn = existingTurn[0] ?? null;
  if (!currentTurn && nextTurnNumber <= season.turnCount && business.status === "active" && !state.insolvent) {
    const [created] = await insertOpenTurn(business.id, season.id, rule?.id ?? season.ruleVersionId, season.seed, nextTurnNumber, season.mode);
    currentTurn = created ?? (await db.select().from(turns).where(and(eq(turns.businessId, business.id), eq(turns.turnNumber, nextTurnNumber))).limit(1))[0] ?? null;
  }
  return { business, season, rule, config, state, currentTurn };
}

export async function getGameSnapshot(profileId: string) {
  const [profileRow] = await db.select().from(ceoProfiles).where(eq(ceoProfiles.id, profileId)).limit(1);
  if (!profileRow) throw new GameServiceError("Your CEO profile could not be found.", 404);
  const context = await getBusinessContext(profileId);
  const { business, season, config, state, currentTurn } = context;
  const historyRows = await db.select({ turn: turns, score: scores.totalScore, cumulativeScore: scores.cumulativeScore })
    .from(turns)
    .leftJoin(scores, eq(scores.turnId, turns.id))
    .where(eq(turns.businessId, business.id))
    .orderBy(turns.turnNumber);
  const history = historyRows.filter((row) => row.turn.status === "simulated").map((row) => ({
    id: row.turn.id,
    turnNumber: row.turn.turnNumber,
    decisions: row.turn.decisions,
    outcome: row.turn.outcome,
    explanations: row.turn.explanations,
    inputHash: row.turn.inputHash,
    outputHash: row.turn.outputHash,
    simulatedAt: row.turn.simulatedAt,
    score: row.score ?? 0,
    cumulativeScore: row.cumulativeScore ?? 0,
  }));
  const achievementRows = await db.select({ achievement: achievements, unlockedAt: userAchievements.unlockedAt })
    .from(userAchievements)
    .innerJoin(achievements, eq(achievements.id, userAchievements.achievementId))
    .where(eq(userAchievements.profileId, profileId))
    .orderBy(desc(userAchievements.unlockedAt));
  const boardRows = state.month > 0 ? await db.select({
    businessId: businesses.id,
    businessName: businesses.name,
    displayName: ceoProfiles.displayName,
    avatar: ceoProfiles.avatar,
    turnNumber: turns.turnNumber,
    score: scores.totalScore,
    cumulativeScore: scores.cumulativeScore,
    mode: seasons.mode,
  })
    .from(scores)
    .innerJoin(turns, eq(turns.id, scores.turnId))
    .innerJoin(businesses, eq(businesses.id, scores.businessId))
    .innerJoin(seasons, eq(seasons.id, businesses.seasonId))
    .innerJoin(ceoProfiles, eq(ceoProfiles.id, businesses.ceoProfileId))
    .where(and(eq(seasons.mode, season.mode), eq(turns.turnNumber, state.month)))
    .orderBy(desc(scores.cumulativeScore))
    .limit(50) : [];
  const leaderboard = boardRows.map((entry, index) => ({
    rank: index + 1,
    businessId: entry.businessId,
    company: entry.businessName,
    name: entry.displayName,
    avatar: entry.avatar,
    turnNumber: entry.turnNumber,
    score: entry.cumulativeScore,
    lastTurnScore: entry.score,
    isYou: entry.businessId === business.id,
  }));
  const myRank = leaderboard.find((entry) => entry.isYou)?.rank ?? null;
  let upcoming = null;
  if (currentTurn && business.status === "active" && !state.insolvent) {
    const previewSeed = { player: currentTurn.seed, event: currentTurn.eventSeed };
    const preview = simulateTurn(state, state.previousDecisions ?? DEFAULT_DECISIONS, config, previewSeed);
    upcoming = {
      turnNumber: currentTurn.turnNumber,
      deadline: currentTurn.deadline,
      events: preview.events,
      defaultDecisions: carryForwardDecisions(state.previousDecisions ?? DEFAULT_DECISIONS),
    };
  }
  return {
    profile: {
      id: profileRow.id,
      displayName: profileRow.displayName,
      avatar: profileRow.avatar,
      country: profileRow.country,
      persona: profileRow.persona,
      xp: profileRow.xp,
      level: profileRow.level,
      activeTitle: profileRow.activeTitle,
    },
    isAdmin: context.rule?.status === "published" && process.env.ARENA_ADMIN_MODE === "true",
    business: { id: business.id, name: business.name, brandColor: business.brandColor, status: business.status, archetype: business.archetype },
    season: { id: season.id, name: season.name, mode: season.mode, status: season.status, turnCount: season.turnCount, inviteCode: season.inviteCode, seed: season.seed },
    state,
    config: {
      referencePrice: config.referencePrice,
      channels: config.channels,
      scoringWeights: config.scoringWeights,
      creditLineLimit: config.creditLineLimit,
      baseCapacity: config.baseCapacity,
      opsCapacityPerPerson: config.opsCapacityPerPerson,
    },
    currentTurn: currentTurn ? { id: currentTurn.id, turnNumber: currentTurn.turnNumber, status: currentTurn.status, deadline: currentTurn.deadline } : null,
    upcoming,
    history,
    leaderboard,
    rank: myRank,
    achievements: achievementRows.map((row) => ({ ...row.achievement, unlockedAt: row.unlockedAt })),
    seasonAverage: history.length ? Math.round(history.reduce((sum, turn) => sum + turn.score, 0) / history.length) : 0,
    seasonProgress: Math.round((state.month / season.turnCount) * 100),
  };
}

function validateDecisionLimits(decisions: Decisions, state: GameState, config: SimulationConfig) {
  if (decisions.pricing.price < config.referencePrice * 0.5 || decisions.pricing.price > config.referencePrice * 2) {
    throw new GameServiceError(`Price must be between ₦${Math.round(config.referencePrice * 0.5).toLocaleString("en-NG")} and ₦${Math.round(config.referencePrice * 2).toLocaleString("en-NG")}.`, 400, { field: "pricing.price" });
  }
  for (const [channel, spend] of Object.entries(decisions.marketing)) {
    if (spend > state.cash) throw new GameServiceError(`Each marketing channel is capped at available cash (₦${Math.round(state.cash).toLocaleString("en-NG")}).`, 400, { field: `marketing.${channel}` });
  }
  if (state.salesStaff + decisions.sales.staffChange < 0) throw new GameServiceError("You cannot reduce the sales team below zero.", 400, { field: "sales.staffChange" });
  if (state.opsStaff + decisions.operations.staffChange < 0) throw new GameServiceError("You cannot reduce operations staff below zero.", 400, { field: "operations.staffChange" });
  if (decisions.finance.draw > Math.max(0, state.creditLineLimit - state.debt)) throw new GameServiceError("That draw exceeds the remaining credit line.", 400, { field: "finance.draw" });
  if (decisions.finance.repay > state.debt + decisions.finance.draw) throw new GameServiceError("Repayment cannot exceed outstanding debt.", 400, { field: "finance.repay" });
  if (decisions.finance.draw > 0 && decisions.finance.repay > 0) throw new GameServiceError("Choose either a credit draw or a repayment this month.", 400, { field: "finance" });
}

function xpLevel(xp: number): number {
  return Math.min(30, Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 250)) + 1));
}

async function unlockAchievement(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  profileId: string,
  key: string,
) {
  const [definition] = await tx.select().from(achievements).where(eq(achievements.key, key)).limit(1);
  if (!definition) return null;
  const [created] = await tx.insert(userAchievements).values({ profileId, achievementId: definition.id })
    .onConflictDoNothing().returning();
  return created ? definition : null;
}

export async function lockTurn(profile: CurrentProfile, turnNumber: number, decisions: Decisions) {
  await ensureAchievementDefinitions();
  const context = await getBusinessContext(profile.profileId);
  const { business, season, rule, config } = context;
  const [turnBefore] = await db.select().from(turns)
    .where(and(eq(turns.businessId, business.id), eq(turns.turnNumber, turnNumber)))
    .limit(1);
  if (!turnBefore) throw new GameServiceError("This decision window is no longer available. Refresh the season.", 409);
  if (turnBefore.status === "simulated") {
    return { alreadySimulated: true, outcome: turnBefore.outcome, explanations: turnBefore.explanations, snapshot: await getGameSnapshot(profile.profileId) };
  }
  if (turnNumber !== (context.state.month + 1) || turnNumber > season.turnCount) {
    throw new GameServiceError("This is not the current month. Refresh the dashboard and try again.", 409);
  }
  if (business.status !== "active" || context.state.insolvent) {
    throw new GameServiceError("This company cannot lock another month.", 409);
  }
  validateDecisionLimits(decisions, context.state, config);
  const result = await db.transaction(async (tx) => {
    const [lockedTurn] = await tx.select().from(turns).where(eq(turns.id, turnBefore.id)).for("update").limit(1);
    if (!lockedTurn) throw new GameServiceError("This decision window is no longer available.", 404);
    if (lockedTurn.status === "simulated") {
      return { alreadySimulated: true, result: null as SimulationResult | null, turn: lockedTurn, achievementsUnlocked: [] as { key: string; name: string; description: string; icon: string; xpReward: number }[] };
    }
    const [lockedBusiness] = await tx.select().from(businesses).where(eq(businesses.id, business.id)).for("update").limit(1);
    if (!lockedBusiness) throw new GameServiceError("Company not found.", 404);
    const lockedState = lockedBusiness.state as unknown as GameState;
    if (lockedState.month + 1 !== turnNumber) throw new GameServiceError("This month was already processed.", 409);
    validateDecisionLimits(decisions, lockedState, config);

    const seedBundle = { player: lockedTurn.seed, event: lockedTurn.eventSeed };
    const inputHash = stableHash({ state: lockedState, decisions, seed: seedBundle, ruleVersion: rule?.id, engineVersion: config.engineVersion });
    const simulation = simulateTurn(lockedState, decisions, config, seedBundle);
    const outputHash = stableHash({ nextState: simulation.nextState, outcome: simulation.outcome, events: simulation.events, explanations: simulation.explanations });
    const [previousScore] = await tx.select().from(scores).where(and(eq(scores.businessId, business.id))).orderBy(desc(scores.createdAt)).limit(1);
    const cumulativeScore = Math.round((lockedState.cumulativeScore * lockedState.month + simulation.outcome.score) / Math.max(1, lockedState.month + 1));
    const now = new Date();

    await tx.update(turns).set({
      status: "simulated",
      inputState: lockedState as unknown as Record<string, unknown>,
      decisions: decisions as unknown as Record<string, unknown>,
      outputState: simulation.nextState as unknown as Record<string, unknown>,
      outcome: simulation.outcome as unknown as Record<string, unknown>,
      explanations: { ...simulation.explanations, events: simulation.events } as unknown as Record<string, unknown>,
      inputHash,
      outputHash,
      simulatedAt: now,
    }).where(eq(turns.id, lockedTurn.id));
    await tx.update(businesses).set({
      state: simulation.nextState as unknown as Record<string, unknown>,
      status: simulation.outcome.insolvent ? "insolvent" : turnNumber >= season.turnCount ? "completed" : "active",
    }).where(eq(businesses.id, business.id));
    await tx.insert(scores).values({
      turnId: lockedTurn.id,
      businessId: business.id,
      dimensionScores: simulation.outcome.dimensions,
      totalScore: simulation.outcome.score,
      cumulativeScore,
    });
    if (simulation.events.length) {
      await tx.insert(marketEvents).values(simulation.events.map((event) => ({
        seasonId: season.id,
        turnNumber,
        eventType: event.key,
        severity: { value: event.severity },
        modifiers: event.modifiers,
      }))).onConflictDoNothing();
    }
    await tx.insert(aiOutputs).values({
      turnId: lockedTurn.id,
      type: "post_turn",
      content: {
        paragraphs: simulation.explanations.coach,
        driverNotes: simulation.explanations.driverNotes,
        source: "simulation-facts",
      },
      model: "rules-coach-v1",
    }).onConflictDoNothing();
    await tx.insert(auditLogs).values({
      actorId: profile.userId,
      action: "turn.simulated",
      entity: "turn",
      entityId: lockedTurn.id,
      payload: { turnNumber, seed: seedBundle, ruleVersionId: rule?.id, inputHash, outputHash },
    });

    const priorTurns = await tx.select({ outcome: turns.outcome }).from(turns)
      .where(and(eq(turns.businessId, business.id), eq(turns.status, "simulated")))
      .orderBy(desc(turns.turnNumber)).limit(3);
    const consecutiveZeroStockouts = priorTurns.length >= 3 && priorTurns.every((row) => {
      const outcome = row.outcome as unknown as { stockouts?: number } | null;
      return (outcome?.stockouts ?? 1) === 0;
    });
    const keys: string[] = [];
    if (turnNumber === 1) keys.push("first_turn");
    if (simulation.outcome.operatingProfit > 0) keys.push("first_profit");
    if (consecutiveZeroStockouts) keys.push("zero_stockouts");
    if (simulation.outcome.activeCustomers >= 1800) keys.push("growth_hacker");
    if (simulation.events.length > 0 && simulation.outcome.operatingProfit > 0) keys.push("crisis_survivor");
    if (turnNumber >= season.turnCount && !simulation.outcome.insolvent) keys.push("season_finisher");
    const achievementsUnlocked = [] as { key: string; name: string; description: string; icon: string; xpReward: number }[];
    for (const key of keys) {
      const achievement = await unlockAchievement(tx, profile.profileId, key);
      if (achievement) achievementsUnlocked.push(achievement);
    }
    const improved = !previousScore || simulation.outcome.score > previousScore.totalScore;
    const xpEarned = 100 + (improved ? 30 : 0) + achievementsUnlocked.reduce((sum, achievement) => sum + achievement.xpReward, 0);
    const newXp = profile.xp + xpEarned;
    const newLevel = xpLevel(newXp);
    const title = achievementsUnlocked.length ? achievementsUnlocked[achievementsUnlocked.length - 1].name : undefined;
    await tx.update(ceoProfiles).set({
      xp: newXp,
      level: newLevel,
      ...(title ? { activeTitle: title } : {}),
    }).where(eq(ceoProfiles.id, profile.profileId));
    if (turnNumber < season.turnCount && !simulation.outcome.insolvent) {
      await tx.insert(turns).values({
        businessId: business.id,
        turnNumber: turnNumber + 1,
        status: "open",
        deadline: scheduledDeadline(season.mode),
        seed: hashSeed(`${season.seed}:${business.id}:player:${turnNumber + 1}`),
        eventSeed: hashSeed(`${season.seed}:market-event:${turnNumber + 1}`),
        ruleVersionId: rule?.id ?? season.ruleVersionId,
      }).onConflictDoNothing();
    }
    return { alreadySimulated: false, result: simulation, turn: lockedTurn, achievementsUnlocked, xpEarned, newLevel, inputHash, outputHash };
  });

  const snapshot = await getGameSnapshot(profile.profileId);
  if (result.alreadySimulated) {
    const [saved] = await db.select().from(turns).where(and(eq(turns.businessId, business.id), eq(turns.turnNumber, turnNumber))).limit(1);
    return { alreadySimulated: true, outcome: saved?.outcome, explanations: saved?.explanations, snapshot };
  }
  if (!result.result) throw new GameServiceError("Simulation completed but no result was returned.", 500);
  return {
    alreadySimulated: false,
    result: result.result,
    achievementsUnlocked: result.achievementsUnlocked,
    xpEarned: result.xpEarned,
    newLevel: result.newLevel,
    inputHash: result.inputHash,
    outputHash: result.outputHash,
    snapshot,
  };
}

export async function runWhatIf(profile: CurrentProfile, turnNumber: number, decisions: Decisions) {
  const context = await getBusinessContext(profile.profileId);
  const { business, season, config, state, currentTurn } = context;
  if (!currentTurn || currentTurn.turnNumber !== turnNumber || state.month + 1 !== turnNumber) {
    throw new GameServiceError("What-if runs are only available for the current open month.", 409);
  }
  validateDecisionLimits(decisions, state, config);
  const runs = await db.select({ id: whatIfRuns.id }).from(whatIfRuns)
    .where(and(eq(whatIfRuns.businessId, business.id), eq(whatIfRuns.turnNumber, turnNumber), gte(whatIfRuns.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))));
  if (runs.length >= 10) throw new GameServiceError("You have used all 10 projections for this month. Your official turn is unaffected.", 429);
  const result = simulateTurn(state, decisions, config, { player: currentTurn.seed, event: currentTurn.eventSeed });
  const projection = {
    revenue: result.outcome.revenue,
    operatingProfit: result.outcome.operatingProfit,
    cash: result.outcome.cash,
    activeCustomers: result.outcome.activeCustomers,
    marketShare: result.outcome.marketShare,
    stockouts: result.outcome.stockouts,
    score: result.outcome.score,
    dimensions: result.outcome.dimensions,
    events: result.events,
    contributions: result.explanations.contributions,
    driverNotes: result.explanations.driverNotes,
  };
  await db.insert(whatIfRuns).values({
    businessId: business.id,
    turnNumber,
    decisions: decisions as unknown as Record<string, unknown>,
    projectedOutcome: projection,
  });
  return { projection, remaining: 9 - runs.length, label: "Projection: not your official turn", seasonId: season.id };
}

export async function updateProfile(profileId: string, input: { displayName?: string; avatar?: string; country?: string; persona?: string }) {
  const displayName = input.displayName?.trim().replace(/\s+/g, " ").slice(0, 28);
  const allowedPersonas = ["founder", "student", "professional", "gamer"];
  const country = input.country?.toUpperCase().slice(0, 2);
  const avatar = input.avatar?.trim().slice(0, 8);
  await db.update(ceoProfiles).set({
    ...(displayName ? { displayName } : {}),
    ...(avatar ? { avatar } : {}),
    ...(country && /^[A-Z]{2}$/.test(country) ? { country } : {}),
    ...(input.persona && allowedPersonas.includes(input.persona) ? { persona: input.persona } : {}),
  }).where(eq(ceoProfiles.id, profileId));
  const [profile] = await db.select().from(ceoProfiles).where(eq(ceoProfiles.id, profileId)).limit(1);
  return profile;
}

export async function saveRuleConfig(profile: CurrentProfile, patch: Partial<SimulationConfig>) {
  if (profile.role !== "admin" && process.env.ARENA_ADMIN_MODE !== "true") {
    throw new GameServiceError("Admin access is required.", 403);
  }
  const active = await db.select().from(ruleVersions).where(eq(ruleVersions.status, "published")).orderBy(desc(ruleVersions.createdAt)).limit(1);
  const base = mergeConfig(active[0]?.config ?? DEFAULT_CONFIG);
  const next = mergeConfig({ ...base, ...patch, channels: { ...base.channels, ...(patch.channels ?? {}) }, scoringWeights: { ...base.scoringWeights, ...(patch.scoringWeights ?? {}) } });
  const weightSum = Object.values(next.scoringWeights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(weightSum - 1) > 0.001) throw new GameServiceError("Scoring weights must add up to 100%.", 400);
  const [created] = await db.insert(ruleVersions).values({
    label: `Lagos Fashion • Rules ${Date.now()}`,
    engineVersion: next.engineVersion,
    config: next as unknown as Record<string, unknown>,
    status: "published",
  }).returning();
  if (active[0]) await db.update(ruleVersions).set({ status: "locked" }).where(eq(ruleVersions.id, active[0].id));
  await db.insert(auditLogs).values({
    actorId: profile.userId,
    action: "rules.published",
    entity: "rule_version",
    entityId: created.id,
    payload: { version: created.label },
  });
  return created;
}

export async function getAdminSummary(profile: CurrentProfile) {
  if (profile.role !== "admin" && process.env.ARENA_ADMIN_MODE !== "true") {
    throw new GameServiceError("Admin access is required.", 403);
  }
  const [rule] = await db.select().from(ruleVersions).orderBy(desc(ruleVersions.createdAt)).limit(1);
  const [seasonCount] = await db.select({ count: sql<number>`count(*)::int` }).from(seasons);
  const [businessCount] = await db.select({ count: sql<number>`count(*)::int` }).from(businesses);
  const [turnCount] = await db.select({ count: sql<number>`count(*)::int` }).from(turns);
  const [latestTurn] = await db.select({ id: turns.id, turnNumber: turns.turnNumber, outputHash: turns.outputHash })
    .from(turns).where(eq(turns.status, "simulated")).orderBy(desc(turns.simulatedAt)).limit(1);
  return { rule, seasonCount: seasonCount?.count ?? 0, businessCount: businessCount?.count ?? 0, turnCount: turnCount?.count ?? 0, latestTurn: latestTurn ?? null };
}
