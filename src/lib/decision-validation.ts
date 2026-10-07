import { z } from "zod";

const nonNegativeMoney = z.coerce.number().finite().min(0).max(100_000_000);
const boundedCount = z.coerce.number().int().min(0).max(20_000);

export const decisionsSchema = z.object({
  pricing: z.object({
    price: z.coerce.number().finite().min(1).max(100_000),
    discount: z.coerce.number().finite().min(0).max(0.4),
  }).strict(),
  marketing: z.object({
    social: nonNegativeMoney,
    influencers: nonNegativeMoney,
    search: nonNegativeMoney,
    offline: nonNegativeMoney,
  }).strict(),
  sales: z.object({
    staffChange: z.coerce.number().int().min(-20).max(20),
    commission: z.coerce.number().finite().min(0).max(0.15),
  }).strict(),
  operations: z.object({
    staffChange: z.coerce.number().int().min(-20).max(20),
    salaryLevel: z.enum(["below", "market", "above"]),
  }).strict(),
  inventory: z.object({
    orderUnits: boundedCount,
    safetyStock: boundedCount,
  }).strict(),
  finance: z.object({
    draw: nonNegativeMoney,
    repay: nonNegativeMoney,
  }).strict(),
  customerExperience: z.object({
    investment: nonNegativeMoney,
  }).strict(),
}).strict();

export const lockRequestSchema = z.object({
  turnNumber: z.coerce.number().int().min(1).max(12),
  decisions: decisionsSchema,
}).strict();

export const startSeasonSchema = z.object({
  businessName: z.string().trim().min(2).max(48).optional(),
  mode: z.enum(["practice", "ranked", "private"]).default("practice"),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
}).strict();

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(28).optional(),
  avatar: z.string().trim().min(1).max(8).optional(),
  country: z.string().trim().length(2).optional(),
  persona: z.enum(["founder", "student", "professional", "gamer"]).optional(),
}).strict();

const channelConfigSchema = z.object({
  capacity: z.coerce.number().finite().min(100).max(1_000_000),
  saturation: z.coerce.number().finite().min(1).max(100_000_000),
  efficiencyMin: z.coerce.number().finite().min(0.1).max(5),
  efficiencyMax: z.coerce.number().finite().min(0.1).max(5),
  awarenessPerMillion: z.coerce.number().finite().min(0).max(30),
  label: z.string().min(1).max(40),
}).refine((value) => value.efficiencyMin <= value.efficiencyMax, { message: "Minimum efficiency must not exceed maximum efficiency." });

export const rulePatchSchema = z.object({
  referencePrice: z.coerce.number().finite().min(1_000).max(1_000_000).optional(),
  baseMarket: z.coerce.number().finite().min(1_000).max(10_000_000).optional(),
  elasticity: z.coerce.number().finite().min(0.1).max(4).optional(),
  baseConversion: z.coerce.number().finite().min(0.001).max(0.2).optional(),
  baseChurn: z.coerce.number().finite().min(0).max(0.5).optional(),
  overhead: z.coerce.number().finite().min(0).max(100_000_000).optional(),
  monthlyInterestRate: z.coerce.number().finite().min(0).max(0.25).optional(),
  creditLineLimit: z.coerce.number().finite().min(0).max(1_000_000_000).optional(),
  scriptedJourney: z.boolean().optional(),
  channels: z.object({
    social: channelConfigSchema.optional(),
    influencers: channelConfigSchema.optional(),
    search: channelConfigSchema.optional(),
    offline: channelConfigSchema.optional(),
  }).strict().optional(),
  scoringWeights: z.object({
    profitability: z.coerce.number().finite().min(0).max(1).optional(),
    revenueGrowth: z.coerce.number().finite().min(0).max(1).optional(),
    cashManagement: z.coerce.number().finite().min(0).max(1).optional(),
    customerGrowth: z.coerce.number().finite().min(0).max(1).optional(),
    retention: z.coerce.number().finite().min(0).max(1).optional(),
    marketingEfficiency: z.coerce.number().finite().min(0).max(1).optional(),
    operations: z.coerce.number().finite().min(0).max(1).optional(),
    riskManagement: z.coerce.number().finite().min(0).max(1).optional(),
  }).strict().optional(),
}).strict();

export type ParsedDecisions = z.infer<typeof decisionsSchema>;
