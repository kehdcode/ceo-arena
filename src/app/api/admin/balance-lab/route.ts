import { apiErrorResponse } from "@/lib/api-error";
import { GameServiceError, getAdminSummary, getCurrentProfile } from "@/lib/game-service";
import { carryForwardDecisions, cloneDecisions, createStartingState, DEFAULT_DECISIONS, hashSeed, mergeConfig, simulateTurn, type Decisions } from "@/lib/engine";

export const dynamic = "force-dynamic";

function strategyDecisions(name: string, prior: Decisions, cash: number, inventory: number, month: number): Decisions {
  const decisions = cloneDecisions(prior);
  decisions.sales.staffChange = 0;
  decisions.operations.staffChange = 0;
  decisions.inventory.orderUnits = 0;
  decisions.finance = { draw: 0, repay: 0 };
  if (name === "Always discount") {
    decisions.pricing = { price: 24000, discount: 0.12 };
    decisions.marketing = { social: 100000, influencers: 60000, search: 80000, offline: 25000 };
    decisions.inventory.orderUnits = inventory < 650 ? 850 : 350;
  } else if (name === "Maximum marketing") {
    decisions.pricing = { price: 29000, discount: 0.03 };
    decisions.marketing = { social: Math.min(cash * 0.1, 800000), influencers: Math.min(cash * 0.08, 600000), search: Math.min(cash * 0.08, 600000), offline: Math.min(cash * 0.04, 300000) };
    decisions.inventory.orderUnits = inventory < 750 ? 1000 : 450;
    decisions.customerExperience.investment = 80000;
  } else if (name === "Conservative cash") {
    decisions.pricing = { price: 31500, discount: 0 };
    decisions.marketing = { social: 60000, influencers: 0, search: 60000, offline: 0 };
    decisions.inventory.orderUnits = inventory < 450 ? 500 : 0;
    decisions.customerExperience.investment = 45000;
    decisions.sales.commission = 0.015;
  } else if (name === "Premium brand") {
    decisions.pricing = { price: 39000, discount: 0.02 };
    decisions.marketing = { social: 180000, influencers: 260000, search: 120000, offline: 80000 };
    decisions.inventory.orderUnits = inventory < 650 ? 850 : 400;
    decisions.customerExperience.investment = 175000;
    decisions.sales.commission = 0.035;
  } else {
    decisions.pricing = { price: month % 4 === 0 ? 31500 : 30000, discount: month === 8 ? 0.05 : 0 };
    decisions.marketing = { social: 220000, influencers: 120000, search: 140000, offline: 45000 };
    decisions.inventory.orderUnits = inventory < 650 ? 850 : 450;
    decisions.customerExperience.investment = 110000;
  }
  return decisions;
}

export async function POST() {
  try {
    const profile = await getCurrentProfile();
    const summary = await getAdminSummary(profile);
    const config = mergeConfig(summary.rule?.config);
    const names = ["Balanced", "Always discount", "Maximum marketing", "Conservative cash", "Premium brand"];
    const strategies = names.map((name) => {
      let state = createStartingState(config);
      const monthlyScores: number[] = [];
      let totalProfit = 0;
      for (let month = 1; month <= 12 && !state.insolvent; month += 1) {
        const decisions = strategyDecisions(name, state.previousDecisions ?? DEFAULT_DECISIONS, state.cash, state.inventory, month);
        const seed = {
          player: hashSeed(`balance-lab:${name}:${month}`),
          event: hashSeed(`balance-lab:shared-market:${month}`),
        };
        const result = simulateTurn(state, decisions, config, seed);
        monthlyScores.push(result.outcome.score);
        totalProfit += result.outcome.netProfit;
        state = result.nextState;
      }
      return {
        name,
        turnsCompleted: monthlyScores.length,
        averageScore: monthlyScores.length ? Math.round(monthlyScores.reduce((sum, score) => sum + score, 0) / monthlyScores.length) : 0,
        finalScore: monthlyScores.at(-1) ?? 0,
        totalProfit: Math.round(totalProfit),
        finalCash: Math.round(state.cash),
        finalCustomers: state.activeCustomers,
        insolvent: state.insolvent,
      };
    });
    const scores = strategies.map((strategy) => strategy.averageScore);
    return Response.json({ ruleVersion: summary.rule.label, strategies, distribution: { min: Math.min(...scores), max: Math.max(...scores), spread: Math.max(...scores) - Math.min(...scores) } });
  } catch (error) {
    if (error instanceof GameServiceError) return apiErrorResponse(error);
    return apiErrorResponse(error);
  }
}
