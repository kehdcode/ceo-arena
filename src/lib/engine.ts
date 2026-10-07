export type Channel = "social" | "influencers" | "search" | "offline";
export type DecisionArea = "pricing" | "marketing" | "sales" | "operations" | "inventory" | "finance" | "customerExperience";
export type SalaryLevel = "below" | "market" | "above";

export interface Decisions {
  pricing: { price: number; discount: number };
  marketing: Record<Channel, number>;
  sales: { staffChange: number; commission: number };
  operations: { staffChange: number; salaryLevel: SalaryLevel };
  inventory: { orderUnits: number; safetyStock: number };
  finance: { draw: number; repay: number };
  customerExperience: { investment: number };
}

export interface Competitor {
  id: string;
  name: string;
  role: "discounter" | "premium" | "follower" | "entrant";
  price: number;
  awareness: number;
  satisfaction: number;
  quality: number;
  marketShare: number;
}

export interface GameState {
  month: number;
  cash: number;
  price: number;
  inventory: number;
  unitCost: number;
  activeCustomers: number;
  awareness: number;
  satisfaction: number;
  debt: number;
  creditLineLimit: number;
  salesStaff: number;
  opsStaff: number;
  baseCapacity: number;
  overhead: number;
  previousRevenue: number;
  previousProfit: number;
  cumulativeScore: number;
  marketShare: number;
  previousMarketLeaderPrice: number;
  previousDecisions: Decisions;
  competitors: Competitor[];
  insolvent: boolean;
}

export interface ChannelConfig {
  capacity: number;
  saturation: number;
  efficiencyMin: number;
  efficiencyMax: number;
  awarenessPerMillion: number;
  label: string;
}

export interface SimulationConfig {
  engineVersion: string;
  referencePrice: number;
  baseMarket: number;
  elasticity: number;
  baseConversion: number;
  baseChurn: number;
  baseCapacity: number;
  salesCapacityPerPerson: number;
  opsCapacityPerPerson: number;
  salesSalary: number;
  opsSalary: number;
  hiringFeeRate: number;
  overhead: number;
  monthlyInterestRate: number;
  emergencyInterestRate: number;
  holdingCostRate: number;
  creditLineLimit: number;
  scriptedJourney: boolean;
  seasonality: number[];
  channels: Record<Channel, ChannelConfig>;
  eventProbabilities: Record<string, number>;
  scoringWeights: Record<string, number>;
  competitors: Competitor[];
  bulkDiscounts: { minimumUnits: number; discount: number }[];
}

export interface SimulationEvent {
  key: string;
  title: string;
  category: string;
  description: string;
  severity: number;
  modifiers: Record<string, number | string>;
}

export interface Contribution {
  area: DecisionArea;
  label: string;
  profit: number;
  revenue: number;
  customers: number;
  score: number;
}

export interface TurnOutcome {
  month: number;
  revenue: number;
  grossProfit: number;
  grossMargin: number;
  operatingProfit: number;
  netProfit: number;
  cash: number;
  debt: number;
  inventory: number;
  orderedUnits: number;
  unitsSold: number;
  demand: number;
  fulfilled: number;
  stockouts: number;
  stockoutRate: number;
  activeCustomers: number;
  newCustomers: number;
  retainedCustomers: number;
  churnedCustomers: number;
  repeatRate: number;
  awareness: number;
  satisfaction: number;
  traffic: number;
  leads: number;
  conversionRate: number;
  marketingSpend: number;
  cac: number;
  roas: number;
  marketSize: number;
  marketShare: number;
  fulfilmentCapacity: number;
  capacityUtilisation: number;
  payroll: number;
  inventorySpend: number;
  cashFlow: number;
  burn: number;
  runway: number;
  overdraftUsed: number;
  interest: number;
  score: number;
  cumulativeScore: number;
  dimensions: Record<string, number>;
  competitorActions: string[];
  competitors: Competitor[];
  insolvent: boolean;
  highlights: string[];
}

export interface SimulationResult {
  nextState: GameState;
  outcome: TurnOutcome;
  events: SimulationEvent[];
  explanations: {
    contributions: Contribution[];
    driverNotes: string[];
    coach: string[];
  };
}

export interface SeedBundle {
  player: number;
  event: number;
}

export const CHANNELS: Channel[] = ["social", "influencers", "search", "offline"];

export const DEFAULT_DECISIONS: Decisions = {
  pricing: { price: 30000, discount: 0 },
  marketing: { social: 250000, influencers: 150000, search: 150000, offline: 50000 },
  sales: { staffChange: 0, commission: 0.03 },
  operations: { staffChange: 0, salaryLevel: "market" },
  inventory: { orderUnits: 0, safetyStock: 250 },
  finance: { draw: 0, repay: 0 },
  customerExperience: { investment: 100000 },
};

export const DEFAULT_COMPETITORS: Competitor[] = [
  { id: "discount-house", name: "Discount House", role: "discounter", price: 26500, awareness: 44, satisfaction: 65, quality: 0.9, marketShare: 0.22 },
  { id: "adire-studio", name: "Adire Studio", role: "premium", price: 39500, awareness: 35, satisfaction: 82, quality: 1.2, marketShare: 0.18 },
  { id: "thread-fast", name: "Thread Fast", role: "follower", price: 31000, awareness: 28, satisfaction: 70, quality: 1, marketShare: 0.16 },
];

export const DEFAULT_CONFIG: SimulationConfig = {
  engineVersion: "1.0.0",
  referencePrice: 30000,
  baseMarket: 40000,
  elasticity: 1.4,
  baseConversion: 0.025,
  baseChurn: 0.08,
  baseCapacity: 1500,
  salesCapacityPerPerson: 350,
  opsCapacityPerPerson: 500,
  salesSalary: 250000,
  opsSalary: 230000,
  hiringFeeRate: 0.5,
  overhead: 1200000,
  monthlyInterestRate: 0.03,
  emergencyInterestRate: 0.06,
  holdingCostRate: 0.025,
  creditLineLimit: 8000000,
  scriptedJourney: true,
  seasonality: [0.88, 0.9, 0.96, 1, 1.02, 0.98, 1.01, 0.96, 1.02, 1.06, 1.12, 1.45],
  channels: {
    social: { capacity: 18000, saturation: 1200000, efficiencyMin: 0.85, efficiencyMax: 1.18, awarenessPerMillion: 4.4, label: "Instagram & TikTok" },
    influencers: { capacity: 12500, saturation: 850000, efficiencyMin: 0.72, efficiencyMax: 1.35, awarenessPerMillion: 6.2, label: "Influencers" },
    search: { capacity: 11000, saturation: 950000, efficiencyMin: 0.9, efficiencyMax: 1.2, awarenessPerMillion: 2.1, label: "Google Search" },
    offline: { capacity: 8500, saturation: 1400000, efficiencyMin: 0.64, efficiencyMax: 1.08, awarenessPerMillion: 3.3, label: "Offline & OOH" },
  },
  eventProbabilities: {
    inflation: 0.08,
    fx: 0.09,
    supplier: 0.08,
    trend: 0.1,
    viral: 0.09,
    fulfilment: 0.06,
  },
  scoringWeights: {
    profitability: 0.2,
    revenueGrowth: 0.15,
    cashManagement: 0.15,
    customerGrowth: 0.1,
    retention: 0.1,
    marketingEfficiency: 0.1,
    operations: 0.1,
    riskManagement: 0.1,
  },
  competitors: DEFAULT_COMPETITORS,
  bulkDiscounts: [
    { minimumUnits: 2000, discount: 0.12 },
    { minimumUnits: 1000, discount: 0.08 },
    { minimumUnits: 500, discount: 0.04 },
    { minimumUnits: 0, discount: 0 },
  ],
};

export function createStartingState(config: SimulationConfig = DEFAULT_CONFIG): GameState {
  return {
    month: 0,
    cash: 10_000_000,
    price: 30_000,
    inventory: 1000,
    unitCost: 14_000,
    activeCustomers: 600,
    awareness: 20,
    satisfaction: 70,
    debt: 0,
    creditLineLimit: config.creditLineLimit,
    salesStaff: 4,
    opsStaff: 0,
    baseCapacity: config.baseCapacity,
    overhead: config.overhead,
    previousRevenue: 4_500_000,
    previousProfit: 0,
    cumulativeScore: 0,
    marketShare: 0.1,
    previousMarketLeaderPrice: 30_000,
    previousDecisions: cloneDecisions(DEFAULT_DECISIONS),
    competitors: config.competitors.map((competitor) => ({ ...competitor })),
    insolvent: false,
  };
}

export function cloneDecisions(decisions: Decisions): Decisions {
  return {
    pricing: { ...decisions.pricing },
    marketing: { ...decisions.marketing },
    sales: { ...decisions.sales },
    operations: { ...decisions.operations },
    inventory: { ...decisions.inventory },
    finance: { ...decisions.finance },
    customerExperience: { ...decisions.customerExperience },
  };
}

export function carryForwardDecisions(decisions: Decisions): Decisions {
  return {
    ...cloneDecisions(decisions),
    sales: { ...decisions.sales, staffChange: 0 },
    operations: { ...decisions.operations, staffChange: 0 },
    inventory: { ...decisions.inventory, orderUnits: 0 },
    finance: { draw: 0, repay: 0 },
  };
}

export function hashSeed(value: string | number): number {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) & 0x7fffffff;
}

export function stableHash(value: unknown): string {
  const serialized = stableStringify(value);
  const first = hashSeed(serialized).toString(16).padStart(8, "0");
  const second = hashSeed(`${serialized}:ceo-arena`).toString(16).padStart(8, "0");
  return `${first}${second}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}

function randomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((Number.isFinite(value) ? value : 0) * factor) / factor;
}

function safeCount(value: number): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

function seasonalityFor(month: number, config: SimulationConfig): number {
  return config.seasonality[(month - 1) % config.seasonality.length] ?? 1;
}

function eventRoll(
  month: number,
  config: SimulationConfig,
  seed: number,
): { events: SimulationEvent[]; modifiers: Record<string, number>; viralChannel?: Channel } {
  const random = randomGenerator(seed);
  const events: SimulationEvent[] = [];
  const modifiers: Record<string, number> = {
    marketSize: 1,
    unitCost: 1,
    overhead: 1,
    deliveryRate: 1,
    capacity: 1,
    demand: 1,
    churn: 1,
  };
  let viralChannel: Channel | undefined;
  const draw = (minimum: number, maximum: number) => minimum + random() * (maximum - minimum);
  const add = (event: SimulationEvent) => events.push(event);
  const scripted = config.scriptedJourney;

  if (scripted && month === 3) {
    const severity = draw(0.4, 0.8);
    modifiers.deliveryRate *= 1 - severity;
    add({ key: "supplier_disruption", title: "Supplier disruption", category: "Supply", description: `A Lagos supplier disruption means only ${Math.round((1 - severity) * 100)}% of this month's new order arrives.`, severity, modifiers: { deliveryRate: 1 - severity } });
  }
  if (scripted && month === 4) {
    add({ key: "new_competitor", title: "A new label enters the market", category: "Competition", description: "A fast-moving fashion label has entered the Lagos market and is competing for attention.", severity: 1, modifiers: { competitorCount: 1 } });
  }
  if (scripted && month === 5) {
    const severity = draw(1.5, 2.4);
    viralChannel = CHANNELS[Math.floor(random() * CHANNELS.length)];
    add({ key: "campaign_viral", title: "One campaign catches fire", category: "Marketing", description: `Your ${viralChannel} campaign is gaining unusual momentum this month.`, severity, modifiers: { channelEfficiency: severity, channel: viralChannel } });
  }
  if (scripted && month === 6) {
    const severity = draw(0.05, 0.11);
    modifiers.unitCost *= 1 + severity;
    modifiers.overhead *= 1 + severity * 0.55;
    modifiers.marketSize *= 1 - severity * 0.4;
    add({ key: "inflation_spike", title: "Costs are climbing", category: "Economic", description: `Supplier and operating costs rose by about ${Math.round(severity * 100)}% this month.`, severity, modifiers: { unitCost: 1 + severity, overhead: 1 + severity * 0.55, marketSize: 1 - severity * 0.4 } });
  }
  if (scripted && month === 7) {
    const severity = draw(0.06, 0.14);
    modifiers.churn *= 1 + severity;
    add({ key: "customer_churn", title: "Customers are browsing elsewhere", category: "Customer", description: "A shift in shopping habits is making customer loyalty harder to hold this month.", severity, modifiers: { churn: 1 + severity } });
  }
  if (scripted && month === 8) {
    const severity = draw(0.1, 0.2);
    modifiers.marketSize *= 1 - severity;
    add({ key: "market_slowdown", title: "A quieter shopping month", category: "Trend", description: `Fashion demand across the market is down about ${Math.round(severity * 100)}% this month.`, severity, modifiers: { marketSize: 1 - severity } });
  }
  if (scripted && month === 10) {
    const severity = draw(0.08, 0.16);
    modifiers.unitCost *= 1 + severity;
    add({ key: "fx_shock", title: "Naira pressure lifts fabric costs", category: "FX", description: `Imported fabric is costing around ${Math.round(severity * 100)}% more this month.`, severity, modifiers: { unitCost: 1 + severity } });
  }
  if (scripted && month === 11) {
    const severity = draw(1.55, 2.7);
    viralChannel = CHANNELS[Math.floor(random() * CHANNELS.length)];
    add({ key: "viral_opportunity", title: "A viral moment is possible", category: "Opportunity", description: `One well-timed ${viralChannel} campaign can reach far beyond its usual audience.`, severity, modifiers: { channelEfficiency: severity, channel: viralChannel } });
  }
  if (scripted && month === 12) {
    const severity = draw(0.3, 0.6);
    modifiers.marketSize *= 1 + severity;
    add({ key: "detty_december", title: "Detty December is here", category: "Seasonal", description: `Festive shopping has lifted the addressable market by about ${Math.round(severity * 100)}%.`, severity, modifiers: { marketSize: 1 + severity } });
  }

  const randomEvents: { key: string; probability: number; min: number; max: number }[] = [
    { key: "inflation", probability: config.eventProbabilities.inflation ?? 0, min: 0.05, max: 0.15 },
    { key: "fx", probability: config.eventProbabilities.fx ?? 0, min: 0.08, max: 0.2 },
    { key: "supplier", probability: config.eventProbabilities.supplier ?? 0, min: 0.2, max: 0.6 },
    { key: "trend", probability: config.eventProbabilities.trend ?? 0, min: 0.1, max: 0.25 },
    { key: "viral", probability: config.eventProbabilities.viral ?? 0, min: 1.5, max: 3 },
    { key: "fulfilment", probability: config.eventProbabilities.fulfilment ?? 0, min: 0.2, max: 0.4 },
  ];
  for (const definition of randomEvents) {
    if (events.length >= 2 || random() >= clamp(definition.probability, 0, 1)) continue;
    const severity = draw(definition.min, definition.max);
    if (definition.key === "inflation" && !events.some((event) => event.key === "inflation_spike")) {
      modifiers.unitCost *= 1 + severity;
      modifiers.overhead *= 1 + severity * 0.5;
      modifiers.marketSize *= 1 - severity * 0.4;
      add({ key: "inflation_spike", title: "A small inflation spike", category: "Economic", description: `Costs are up around ${Math.round(severity * 100)}% this month.`, severity, modifiers: { unitCost: 1 + severity, overhead: 1 + severity * 0.5 } });
    } else if (definition.key === "fx" && !events.some((event) => event.key === "fx_shock")) {
      modifiers.unitCost *= 1 + severity;
      add({ key: "fx_shock", title: "Naira depreciation", category: "FX", description: `Imported material costs are up ${Math.round(severity * 100)}% this month.`, severity, modifiers: { unitCost: 1 + severity } });
    } else if (definition.key === "supplier" && !events.some((event) => event.key === "supplier_disruption")) {
      const deliveryRate = 1 - severity;
      modifiers.deliveryRate *= deliveryRate;
      add({ key: "supplier_disruption", title: "Supplier disruption", category: "Supply", description: `Only ${Math.round(deliveryRate * 100)}% of this month's new order arrives.`, severity, modifiers: { deliveryRate } });
    } else if (definition.key === "trend" && !events.some((event) => event.key === "market_slowdown")) {
      const direction = random() > 0.5 ? 1 : -1;
      const factor = 1 + severity * direction;
      modifiers.marketSize *= factor;
      add({ key: "trend_shift", title: direction > 0 ? "A new trend takes off" : "A trend cools down", category: "Customer", description: `The market moved ${Math.round(severity * 100)}% ${direction > 0 ? "higher" : "lower"} this month.`, severity, modifiers: { marketSize: factor } });
    } else if (definition.key === "viral" && !viralChannel) {
      viralChannel = CHANNELS[Math.floor(random() * CHANNELS.length)];
      add({ key: "campaign_viral", title: "A campaign goes viral", category: "Marketing", description: `The ${viralChannel} channel is reaching more shoppers this month.`, severity, modifiers: { channelEfficiency: severity, channel: viralChannel } });
    } else if (definition.key === "fulfilment" && !events.some((event) => event.key === "fulfilment_failure")) {
      const factor = 1 - severity;
      modifiers.capacity *= factor;
      add({ key: "fulfilment_failure", title: "Lagos logistics are under pressure", category: "Operations", description: `Fulfilment capacity is down about ${Math.round(severity * 100)}% this month.`, severity, modifiers: { capacity: factor } });
    }
  }

  return { events, modifiers, viralChannel };
}

function effectiveDecision(previous: Decisions, current: Decisions, area: DecisionArea): Decisions {
  const result = cloneDecisions(current);
  if (area === "pricing") result.pricing = { ...previous.pricing };
  if (area === "marketing") result.marketing = { ...previous.marketing };
  if (area === "sales") result.sales = { ...previous.sales };
  if (area === "operations") result.operations = { ...previous.operations };
  if (area === "inventory") result.inventory = { ...previous.inventory };
  if (area === "finance") result.finance = { ...previous.finance };
  if (area === "customerExperience") result.customerExperience = { ...previous.customerExperience };
  return result;
}

function simulateCore(stateInput: GameState, decisions: Decisions, config: SimulationConfig, seeds: SeedBundle): {
  nextState: GameState;
  outcome: TurnOutcome;
  events: SimulationEvent[];
  driverNotes: string[];
} {
  const state: GameState = {
    ...stateInput,
    previousDecisions: cloneDecisions(stateInput.previousDecisions),
    competitors: stateInput.competitors.map((competitor) => ({ ...competitor })),
  };
  const month = state.month + 1;
  const marketEvents = eventRoll(month, config, seeds.event);
  const { events, modifiers, viralChannel } = marketEvents;
  const playerRandom = randomGenerator(seeds.player);
  const competitorRandom = randomGenerator(hashSeed(`${seeds.player}:competitors:${month}`));
  const actions: string[] = [];

  let competitors = state.competitors.length
    ? state.competitors.map((competitor) => ({ ...competitor }))
    : config.competitors.map((competitor) => ({ ...competitor }));
  if (events.some((event) => event.key === "new_competitor") && !competitors.some((competitor) => competitor.id === "lagos-new-label")) {
    competitors = [...competitors, { id: "lagos-new-label", name: "Supa Studio", role: "entrant", price: 28500, awareness: 24, satisfaction: 72, quality: 1.02, marketShare: 0.08 }];
    actions.push("Supa Studio entered the Lagos fashion market.");
  }
  const previousLeaderPrice = state.previousMarketLeaderPrice || state.price;
  competitors = competitors.map((competitor) => {
    const originalPrice = competitor.price;
    let reactedPrice = originalPrice;
    if (competitor.role === "discounter") {
      reactedPrice *= state.marketShare < 0.15 ? 0.95 : 0.99;
      actions.push(`${competitor.name} ${state.marketShare < 0.15 ? "cut prices to win share" : "held a value-led price"}.`);
    } else if (competitor.role === "premium") {
      competitor.awareness = clamp(competitor.awareness + 1.2, 0, 100);
      actions.push(`${competitor.name} invested in brand awareness and held its premium price.`);
    } else if (competitor.role === "follower") {
      reactedPrice = originalPrice * 0.55 + previousLeaderPrice * 0.45;
      actions.push(`${competitor.name} adjusted toward last month's market-leading price.`);
    }
    const noise = 1 + (competitorRandom() - 0.5) * 0.018;
    return { ...competitor, price: round(clamp(reactedPrice * noise, config.referencePrice * 0.5, config.referencePrice * 2), 0) };
  });

  const effectivePrice = Math.max(1, decisions.pricing.price * (1 - decisions.pricing.discount));
  const refPrice = competitors.length
    ? competitors.reduce((sum, competitor) => sum + competitor.price * Math.max(0.05, competitor.marketShare), 0) /
      competitors.reduce((sum, competitor) => sum + Math.max(0.05, competitor.marketShare), 0)
    : config.referencePrice;
  const priceFactor = clamp((refPrice / effectivePrice) ** config.elasticity, 0.25, 2.7);
  const awarenessBefore = clamp(state.awareness, 0, 100);
  const satisfactionBefore = clamp(state.satisfaction, 0, 100);
  const marketSize = Math.max(0, config.baseMarket * seasonalityFor(month, config) * modifiers.marketSize * modifiers.demand);

  const channelTraffic: Record<Channel, number> = { social: 0, influencers: 0, search: 0, offline: 0 };
  let awarenessGain = 0;
  let marketingSpend = 0;
  for (const channel of CHANNELS) {
    const channelConfig = config.channels[channel];
    const spend = Math.max(0, decisions.marketing[channel]);
    marketingSpend += spend;
    const randomEfficiency = channelConfig.efficiencyMin + playerRandom() * (channelConfig.efficiencyMax - channelConfig.efficiencyMin);
    const eventEfficiency = viralChannel === channel
      ? Number(events.find((event) => event.modifiers.channel === channel)?.modifiers.channelEfficiency ?? 1)
      : 1;
    channelTraffic[channel] = channelConfig.capacity * (1 - Math.exp(-spend / Math.max(1, channelConfig.saturation))) * randomEfficiency * eventEfficiency;
    awarenessGain += (spend / 1_000_000) * channelConfig.awarenessPerMillion * randomEfficiency * (viralChannel === channel ? 1.4 : 1);
  }
  const traffic = Math.max(0, Object.values(channelTraffic).reduce((sum, value) => sum + value, 0));
  const awareness = clamp(awarenessBefore * 0.85 + awarenessGain, 0, 100);

  const playerAttractiveness = priceFactor * (0.5 + awareness / 100) * (0.7 + (satisfactionBefore / 100) * 0.6);
  const competitorAttractiveness = competitors.map((competitor) => {
    const competitorPriceFactor = clamp((refPrice / Math.max(1, competitor.price)) ** config.elasticity, 0.2, 2.5);
    const attractiveness = competitorPriceFactor * (0.5 + competitor.awareness / 100) * (0.7 + (competitor.satisfaction / 100) * 0.6) * competitor.quality;
    return { ...competitor, attractiveness };
  });
  const totalAttractiveness = playerAttractiveness + competitorAttractiveness.reduce((sum, competitor) => sum + competitor.attractiveness, 0);
  const marketShare = totalAttractiveness > 0 ? clamp(playerAttractiveness / totalAttractiveness, 0, 1) : 0;
  const updatedCompetitors = competitorAttractiveness.map(({ attractiveness: _attractiveness, ...competitor }) => ({
    ...competitor,
    marketShare: totalAttractiveness > 0 ? round(competitorAttractiveness.find((candidate) => candidate.id === competitor.id)!.attractiveness / totalAttractiveness, 4) : 0,
  }));
  const salesStaff = Math.max(0, safeCount(state.salesStaff + decisions.sales.staffChange));
  const opsStaff = Math.max(0, safeCount(state.opsStaff + decisions.operations.staffChange));
  const salaryMultipliers: Record<SalaryLevel, number> = { below: 0.85, market: 1, above: 1.2 };
  const productivityMultiplier: Record<SalaryLevel, number> = { below: 0.9, market: 1, above: 1.08 };
  const salaryMultiplier = salaryMultipliers[decisions.operations.salaryLevel] ?? 1;
  const employeeProductivity = productivityMultiplier[decisions.operations.salaryLevel] ?? 1;
  const commissionBoost = 1 + clamp(decisions.sales.commission, 0, 0.15) * 1.4;
  const salesCapacity = salesStaff * config.salesCapacityPerPerson * employeeProductivity;
  const baseNewDemand = Math.min(
    traffic * config.baseConversion * Math.sqrt(priceFactor) * commissionBoost,
    marketSize * marketShare,
  );
  const newCustomerDemand = Math.min(baseNewDemand, salesCapacity) + Math.max(0, baseNewDemand - salesCapacity) * 0.1;
  const repeatRate = clamp(0.16 + (satisfactionBefore - 50) * 0.0022, 0.08, 0.33);
  const repeatOrders = state.activeCustomers * repeatRate;
  const referralRate = clamp(0.012 + satisfactionBefore * 0.00032, 0.015, 0.055);
  const referralDemand = state.activeCustomers * referralRate;
  const demand = Math.max(0, newCustomerDemand + repeatOrders + referralDemand);
  const fulfilmentCapacity = Math.max(0, (state.baseCapacity + opsStaff * config.opsCapacityPerPerson) * modifiers.capacity * employeeProductivity);

  const supplierArrivalRate = clamp(modifiers.deliveryRate, 0, 1);
  const manualOrderUnits = safeCount(decisions.inventory.orderUnits);
  const automaticSafetyOrder = Math.max(0, safeCount(decisions.inventory.safetyStock) - safeCount(state.inventory));
  const orderedUnits = Math.max(manualOrderUnits, automaticSafetyOrder);
  const arrivingUnits = safeCount(orderedUnits * supplierArrivalRate);
  const availableInventory = Math.max(0, safeCount(state.inventory) + arrivingUnits);
  const fulfilled = Math.min(safeCount(demand), availableInventory, safeCount(fulfilmentCapacity));
  const stockouts = Math.max(0, safeCount(demand) - fulfilled);
  const stockoutRate = demand > 0 ? clamp(stockouts / demand, 0, 1) : 0;
  const capacityUtilisation = fulfilmentCapacity > 0 ? clamp(demand / fulfilmentCapacity, 0, 2) : demand > 0 ? 2 : 0;

  const cxInvestment = Math.max(0, decisions.customerExperience.investment);
  const cxEffect = clamp(cxInvestment / 1_000_000 * 0.12, 0, 0.35);
  const churnRate = clamp(config.baseChurn * (1 + stockoutRate * 2) * (1 - cxEffect) * modifiers.churn, 0, 0.65);
  const churnedCustomers = Math.min(safeCount(state.activeCustomers), safeCount(state.activeCustomers * churnRate));
  const fulfilledFraction = demand > 0 ? fulfilled / demand : 0;
  const newCustomers = safeCount((newCustomerDemand + referralDemand) * fulfilledFraction);
  const retainedCustomers = Math.max(0, safeCount(state.activeCustomers) - churnedCustomers);
  const activeCustomers = Math.max(0, retainedCustomers + newCustomers);
  const cxSatisfaction = Math.min(12, Math.log1p(cxInvestment / 150_000) * 3.5);
  const stockoutPenalty = stockoutRate * 23;
  const overloadPenalty = capacityUtilisation > 1 ? Math.min(8, (capacityUtilisation - 1) * 10) : 0;
  const satisfaction = clamp(satisfactionBefore + cxSatisfaction - stockoutPenalty - overloadPenalty + (fulfilled > 0 ? 0.4 : -1.5), 0, 100);

  const bulkTier = config.bulkDiscounts.find((tier) => orderedUnits >= tier.minimumUnits) ?? { minimumUnits: 0, discount: 0 };
  const purchaseUnitCost = Math.max(0, state.unitCost * (1 - bulkTier.discount) * modifiers.unitCost);
  const inventorySpend = orderedUnits * purchaseUnitCost;
  const inventoryValueAvailable = state.inventory * state.unitCost + arrivingUnits * purchaseUnitCost;
  const averageUnitCost = availableInventory > 0 ? inventoryValueAvailable / availableInventory : state.unitCost;
  const unitsSold = Math.min(fulfilled, availableInventory);
  const inventory = Math.max(0, availableInventory - unitsSold);
  const nextUnitCost = inventory > 0 ? (inventoryValueAvailable - unitsSold * averageUnitCost) / inventory : (arrivingUnits > 0 ? purchaseUnitCost : state.unitCost);
  const cogs = unitsSold * averageUnitCost;
  const revenue = unitsSold * effectivePrice;
  const payroll = salesStaff * config.salesSalary * salaryMultiplier + opsStaff * config.opsSalary * salaryMultiplier;
  const hiringFees = (Math.max(0, decisions.sales.staffChange) * config.salesSalary + Math.max(0, decisions.operations.staffChange) * config.opsSalary) * config.hiringFeeRate;
  const commissions = revenue * clamp(decisions.sales.commission, 0, 0.15);
  const overhead = state.overhead * modifiers.overhead;
  const holdingCost = inventory * nextUnitCost * config.holdingCostRate;
  const debtDrawn = Math.min(Math.max(0, decisions.finance.draw), Math.max(0, state.creditLineLimit - state.debt));
  const debtRepaid = Math.min(Math.max(0, decisions.finance.repay), Math.max(0, state.debt + debtDrawn));
  const debtBeforeOverdraft = Math.max(0, state.debt + debtDrawn - debtRepaid);
  const interest = debtBeforeOverdraft * config.monthlyInterestRate;
  const operatingExpenses = payroll + commissions + marketingSpend + cxInvestment + overhead + holdingCost + hiringFees + interest;
  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0 ? grossProfit / revenue : 0;
  const operatingProfit = grossProfit - payroll - commissions - marketingSpend - cxInvestment - overhead - holdingCost - hiringFees;
  const netProfitBeforeOverdraft = operatingProfit - interest;
  const cashFlowBeforeOverdraft = revenue - inventorySpend - operatingExpenses + debtDrawn - debtRepaid;
  const cashBeforeOverdraft = state.cash + cashFlowBeforeOverdraft;
  const overdraftUsed = Math.max(0, -cashBeforeOverdraft);
  const emergencyInterest = overdraftUsed * config.emergencyInterestRate;
  const cash = Math.max(0, cashBeforeOverdraft - emergencyInterest);
  const debt = Math.max(0, debtBeforeOverdraft + overdraftUsed + emergencyInterest);
  const netProfit = netProfitBeforeOverdraft - emergencyInterest;
  const cashFlow = cash - state.cash;
  const burn = Math.max(0, -cashFlow);
  const monthlyFixedCosts = Math.max(1, payroll + overhead + marketingSpend + cxInvestment);
  const runway = cash > 0 ? cash / monthlyFixedCosts : 0;
  const insolvent = debt > state.creditLineLimit * 1.5;
  const leads = traffic * 0.32;
  const conversionRate = traffic > 0 ? newCustomerDemand / traffic : 0;
  const cac = newCustomers > 0 ? marketingSpend / newCustomers : marketingSpend > 0 ? marketingSpend : 0;
  const roas = marketingSpend > 0 ? revenue / marketingSpend : 0;
  const playerShare = marketShare;
  const competitorPriceLeader = [effectivePrice, ...updatedCompetitors.map((competitor) => competitor.price)].reduce((best, price) => price < best ? price : best, Number.POSITIVE_INFINITY);
  const dimensionScores = scoreDimensions({
    revenue,
    previousRevenue: state.previousRevenue,
    operatingProfit,
    grossMargin,
    cash,
    runway,
    activeCustomers,
    initialCustomers: 600,
    satisfaction,
    churnRate,
    cac,
    roas,
    conversionRate,
    marketingSpend,
    fulfilled,
    demand,
    debt,
    creditLineLimit: state.creditLineLimit,
    overdraftUsed,
    stockoutRate,
    capacityUtilisation,
    config,
  });
  const score = Math.round(Object.entries(dimensionScores).reduce((sum, [key, dimension]) => sum + dimension * (config.scoringWeights[key] ?? 0), 0) * 10);
  const cumulativeScore = Math.round((state.cumulativeScore * state.month + score) / month);
  const marketShareByPlayer = playerShare;
  const nextState: GameState = {
    month,
    cash: round(cash, 2),
    price: round(decisions.pricing.price, 2),
    inventory,
    unitCost: round(nextUnitCost, 2),
    activeCustomers,
    awareness: round(awareness, 2),
    satisfaction: round(satisfaction, 2),
    debt: round(debt, 2),
    creditLineLimit: state.creditLineLimit,
    salesStaff,
    opsStaff,
    baseCapacity: state.baseCapacity,
    overhead: state.overhead,
    previousRevenue: round(revenue, 2),
    previousProfit: round(netProfit, 2),
    cumulativeScore,
    marketShare: round(marketShareByPlayer, 4),
    previousMarketLeaderPrice: round(competitorPriceLeader, 2),
    previousDecisions: carryForwardDecisions(decisions),
    competitors: updatedCompetitors,
    insolvent,
  };
  const driverNotes: string[] = [];
  if (stockoutRate > 0.02) driverNotes.push(`You fulfilled ${Math.round((1 - stockoutRate) * 100)}% of demand; about ${stockouts.toLocaleString("en-NG")} orders could not be served.`);
  if (marketingSpend > 0 && roas < 2) driverNotes.push(`Marketing returned ₦${Math.round(roas * 100) / 100} in revenue for each ₦1 spent (ROAS ${round(roas, 2)}×).`);
  if (marketingSpend > 0 && cac > 0) driverNotes.push(`Your customer acquisition cost was about ₦${Math.round(cac).toLocaleString("en-NG")} per new customer.`);
  if (operatingProfit < 0) driverNotes.push(`Operating costs exceeded gross profit by ₦${Math.abs(Math.round(operatingProfit)).toLocaleString("en-NG")} this month.`);
  else driverNotes.push(`The business generated ₦${Math.round(operatingProfit).toLocaleString("en-NG")} in operating profit before interest.`);
  if (overdraftUsed > 0) driverNotes.push(`Cash commitments created a ₦${Math.round(overdraftUsed).toLocaleString("en-NG")} emergency overdraft; it carries the 6% monthly penalty rate.`);
  else if (runway < 2) driverNotes.push(`Current cash covers about ${round(runway, 1)} months of fixed operating commitments.`);
  if (satisfaction < satisfactionBefore) driverNotes.push(`Customer satisfaction moved down ${round(satisfactionBefore - satisfaction, 1)} points, mainly from stockouts and fulfilment pressure.`);
  else if (satisfaction > satisfactionBefore) driverNotes.push(`Customer satisfaction improved by ${round(satisfaction - satisfactionBefore, 1)} points with this month's experience investment.`);
  if (debt > state.creditLineLimit * 1.5) driverNotes.push("Debt crossed 150% of the credit line. The business is insolvent and this season run is over.");
  if (events.length === 0) driverNotes.push("No major market shock landed this month; your results were driven mostly by pricing, demand, and operations.");

  const highlights = [
    revenue >= state.previousRevenue ? "Revenue grew month over month" : "Revenue came in below last month",
    operatingProfit >= 0 ? "Operating profit stayed positive" : "Operating profit was negative",
    stockoutRate < 0.02 ? "Demand was almost fully served" : `${Math.round(stockoutRate * 100)}% of demand went unfilled`,
  ];
  const outcome: TurnOutcome = {
    month,
    revenue: round(revenue, 2),
    grossProfit: round(grossProfit, 2),
    grossMargin: round(grossMargin, 4),
    operatingProfit: round(operatingProfit, 2),
    netProfit: round(netProfit, 2),
    cash: round(cash, 2),
    debt: round(debt, 2),
    inventory,
    orderedUnits,
    unitsSold,
    demand: round(demand, 2),
    fulfilled,
    stockouts,
    stockoutRate: round(stockoutRate, 4),
    activeCustomers,
    newCustomers,
    retainedCustomers,
    churnedCustomers,
    repeatRate: round(repeatRate, 4),
    awareness: round(awareness, 2),
    satisfaction: round(satisfaction, 2),
    traffic: Math.round(traffic),
    leads: Math.round(leads),
    conversionRate: round(conversionRate, 4),
    marketingSpend: round(marketingSpend, 2),
    cac: round(cac, 2),
    roas: round(roas, 2),
    marketSize: Math.round(marketSize),
    marketShare: round(marketShare, 4),
    fulfilmentCapacity: Math.round(fulfilmentCapacity),
    capacityUtilisation: round(capacityUtilisation, 4),
    payroll: round(payroll, 2),
    inventorySpend: round(inventorySpend, 2),
    cashFlow: round(cashFlow, 2),
    burn: round(burn, 2),
    runway: round(runway, 2),
    overdraftUsed: round(overdraftUsed, 2),
    interest: round(interest + emergencyInterest, 2),
    score,
    cumulativeScore,
    dimensions: dimensionScores,
    competitorActions: actions,
    competitors: updatedCompetitors,
    insolvent,
    highlights,
  };
  return { nextState, outcome, events, driverNotes };
}

function scoreDimensions(input: {
  revenue: number;
  previousRevenue: number;
  operatingProfit: number;
  grossMargin: number;
  cash: number;
  runway: number;
  activeCustomers: number;
  initialCustomers: number;
  satisfaction: number;
  churnRate: number;
  cac: number;
  roas: number;
  conversionRate: number;
  marketingSpend: number;
  fulfilled: number;
  demand: number;
  debt: number;
  creditLineLimit: number;
  overdraftUsed: number;
  stockoutRate: number;
  capacityUtilisation: number;
  config: SimulationConfig;
}): Record<string, number> {
  const growth = input.previousRevenue > 0 ? input.revenue / input.previousRevenue - 1 : 0;
  const fulfilmentRate = input.demand > 0 ? input.fulfilled / input.demand : 1;
  const dimensions: Record<string, number> = {
    profitability: clamp(45 + input.grossMargin * 55 + input.operatingProfit / 1_500_000 * 12, 0, 100),
    revenueGrowth: clamp(50 + growth * 33, 0, 100),
    cashManagement: clamp(input.runway / 5 * 80 + (input.cash > 0 ? 20 : 0), 0, 100),
    customerGrowth: clamp(48 + (input.activeCustomers / Math.max(1, input.initialCustomers) - 1) * 18, 0, 100),
    retention: clamp(input.satisfaction * 0.62 + (1 - input.churnRate) * 38, 0, 100),
    marketingEfficiency: input.marketingSpend <= 0
      ? 62
      : clamp(45 + (input.roas - 1) * 11 + (input.conversionRate - input.config.baseConversion) * 500, 0, 100),
    operations: clamp(55 + (fulfilmentRate - 0.75) * 70 - input.stockoutRate * 28 - Math.max(0, input.capacityUtilisation - 1) * 12, 0, 100),
    riskManagement: clamp(100 - input.debt / Math.max(1, input.creditLineLimit) * 45 - (input.overdraftUsed > 0 ? 24 : 0) - (input.runway < 1 ? 24 : 0), 0, 100),
  };
  for (const key of Object.keys(dimensions)) dimensions[key] = Math.round(clamp(dimensions[key], 0, 100));
  return dimensions;
}

const AREA_LABELS: Record<DecisionArea, string> = {
  pricing: "Price & promotions",
  marketing: "Marketing mix",
  sales: "Sales team & incentives",
  operations: "Hiring & fulfilment",
  inventory: "Inventory strategy",
  finance: "Finance decisions",
  customerExperience: "Customer experience",
};

export function simulateTurn(
  state: GameState,
  decisions: Decisions,
  config: SimulationConfig = DEFAULT_CONFIG,
  seed: number | SeedBundle = 1,
): SimulationResult {
  const seeds: SeedBundle = typeof seed === "number"
    ? { player: seed, event: hashSeed(`${seed}:shared-events`) }
    : seed;
  const current = simulateCore(state, decisions, config, seeds);
  const previous = state.previousDecisions ?? DEFAULT_DECISIONS;
  const areas: DecisionArea[] = ["pricing", "marketing", "sales", "operations", "inventory", "finance", "customerExperience"];
  const contributions: Contribution[] = areas.map((area) => {
    const counterfactualDecisions = effectiveDecision(previous, decisions, area);
    const counterfactual = simulateCore(state, counterfactualDecisions, config, seeds);
    return {
      area,
      label: AREA_LABELS[area],
      profit: round(current.outcome.netProfit - counterfactual.outcome.netProfit, 2),
      revenue: round(current.outcome.revenue - counterfactual.outcome.revenue, 2),
      customers: current.outcome.activeCustomers - counterfactual.outcome.activeCustomers,
      score: current.outcome.score - counterfactual.outcome.score,
    };
  });
  const coach: string[] = [];
  const bestContribution = [...contributions].sort((left, right) => right.profit - left.profit)[0];
  const weakestContribution = [...contributions].sort((left, right) => left.profit - right.profit)[0];
  coach.push(bestContribution.profit >= 0
    ? `${bestContribution.label} was your strongest decision versus last month's plan, contributing about ₦${Math.round(bestContribution.profit).toLocaleString("en-NG")} in profit.`
    : `${bestContribution.label} was the clearest trade-off this month; versus last month's plan, it changed profit by ₦${Math.round(bestContribution.profit).toLocaleString("en-NG")} .`);
  if (weakestContribution.area !== bestContribution.area) {
    coach.push(`${weakestContribution.label} is worth revisiting next month; its measured profit difference was ₦${Math.round(weakestContribution.profit).toLocaleString("en-NG")} against the same market seed.`);
  }
  coach.push(current.outcome.stockoutRate > 0.08
    ? "Compare an earlier stock commitment with the cost of carrying more units; demand and cash are both part of that trade-off."
    : current.outcome.runway < 3
      ? "Protecting runway may matter more than chasing the next unit of growth while cash cover is tight."
      : "Keep an eye on whether your customer experience and fulfilment capacity can sustain the growth you are buying.");
  return {
    nextState: current.nextState,
    outcome: current.outcome,
    events: current.events,
    explanations: { contributions, driverNotes: current.driverNotes, coach },
  };
}

export function mergeConfig(input: unknown): SimulationConfig {
  if (!input || typeof input !== "object") return structuredClone(DEFAULT_CONFIG);
  const value = input as Partial<SimulationConfig>;
  const channels = { ...DEFAULT_CONFIG.channels, ...(value.channels ?? {}) };
  const weights = { ...DEFAULT_CONFIG.scoringWeights, ...(value.scoringWeights ?? {}) };
  return {
    ...DEFAULT_CONFIG,
    ...value,
    channels,
    scoringWeights: weights,
    seasonality: Array.isArray(value.seasonality) && value.seasonality.length >= 12 ? value.seasonality.slice(0, 12) : [...DEFAULT_CONFIG.seasonality],
    eventProbabilities: { ...DEFAULT_CONFIG.eventProbabilities, ...(value.eventProbabilities ?? {}) },
    competitors: Array.isArray(value.competitors) ? value.competitors as Competitor[] : DEFAULT_COMPETITORS.map((competitor) => ({ ...competitor })),
    bulkDiscounts: Array.isArray(value.bulkDiscounts) ? value.bulkDiscounts : [...DEFAULT_CONFIG.bulkDiscounts],
  };
}
