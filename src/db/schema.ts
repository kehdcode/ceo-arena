import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("player"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ceoProfiles = pgTable("ceo_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  displayName: text("display_name").notNull().default("CEO"),
  avatar: text("avatar").notNull().default("✦"),
  country: text("country").notNull().default("NG"),
  persona: text("persona").notNull().default("founder"),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  activeTitle: text("active_title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ruleVersions = pgTable("rule_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  engineVersion: text("engine_version").notNull().default("1.0.0"),
  config: jsonb("config").$type<Record<string, unknown>>().notNull(),
  status: text("status").notNull().default("published"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  mode: text("mode").notNull().default("practice"),
  ruleVersionId: uuid("rule_version_id").notNull().references(() => ruleVersions.id),
  startingConditions: jsonb("starting_conditions").$type<Record<string, unknown>>().notNull(),
  seed: integer("seed").notNull(),
  turnCount: integer("turn_count").notNull().default(12),
  turnSchedule: jsonb("turn_schedule").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("published"),
  inviteCode: text("invite_code").unique(),
  orgName: text("org_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  ceoProfileId: uuid("ceo_profile_id").notNull().references(() => ceoProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  archetype: text("archetype").notNull().default("lagos-fashion-ecommerce"),
  brandColor: text("brand_color").notNull().default("#c8ff55"),
  status: text("status").notNull().default("active"),
  state: jsonb("state").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  profileIndex: index("businesses_profile_idx").on(table.ceoProfileId),
  seasonIndex: index("businesses_season_idx").on(table.seasonId),
}));

export const turns = pgTable("turns", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  turnNumber: integer("turn_number").notNull(),
  status: text("status").notNull().default("open"),
  deadline: timestamp("deadline", { withTimezone: true }),
  inputState: jsonb("input_state").$type<Record<string, unknown>>(),
  decisions: jsonb("decisions").$type<Record<string, unknown>>(),
  seed: integer("seed").notNull(),
  eventSeed: integer("event_seed").notNull(),
  ruleVersionId: uuid("rule_version_id").notNull().references(() => ruleVersions.id),
  outputState: jsonb("output_state").$type<Record<string, unknown>>(),
  outcome: jsonb("outcome").$type<Record<string, unknown>>(),
  explanations: jsonb("explanations").$type<Record<string, unknown>>(),
  inputHash: text("input_hash"),
  outputHash: text("output_hash"),
  simulatedAt: timestamp("simulated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueBusinessTurn: uniqueIndex("turns_business_turn_unique").on(table.businessId, table.turnNumber),
  businessIndex: index("turns_business_idx").on(table.businessId),
}));

export const scores = pgTable("scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  turnId: uuid("turn_id").notNull().references(() => turns.id, { onDelete: "cascade" }).unique(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  dimensionScores: jsonb("dimension_scores").$type<Record<string, number>>().notNull(),
  totalScore: integer("total_score").notNull(),
  cumulativeScore: integer("cumulative_score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  businessIndex: index("scores_business_idx").on(table.businessId),
}));

export const marketEvents = pgTable("market_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  turnNumber: integer("turn_number").notNull(),
  eventType: text("event_type").notNull(),
  severity: jsonb("severity").$type<Record<string, number>>().notNull(),
  modifiers: jsonb("modifiers").$type<Record<string, unknown>>().notNull(),
  requiresChoice: boolean("requires_choice").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueSeasonEvent: uniqueIndex("market_events_season_turn_type_unique").on(table.seasonId, table.turnNumber, table.eventType),
}));

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("✦"),
  xpReward: integer("xp_reward").notNull().default(0),
});

export const userAchievements = pgTable("user_achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => ceoProfiles.id, { onDelete: "cascade" }),
  achievementId: uuid("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueProfileAchievement: uniqueIndex("user_achievements_profile_achievement_unique").on(table.profileId, table.achievementId),
}));

export const aiOutputs = pgTable("ai_outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  turnId: uuid("turn_id").notNull().references(() => turns.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  model: text("model").notNull().default("rules-coach-v1"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  turnTypeUnique: uniqueIndex("ai_outputs_turn_type_unique").on(table.turnId, table.type),
}));

export const whatIfRuns = pgTable("whatif_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  turnNumber: integer("turn_number").notNull(),
  decisions: jsonb("decisions").$type<Record<string, unknown>>().notNull(),
  projectedOutcome: jsonb("projected_outcome").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  businessTurnIndex: index("whatif_business_turn_idx").on(table.businessId, table.turnNumber),
}));

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  entityIndex: index("audit_logs_entity_idx").on(table.entity, table.entityId),
}));
