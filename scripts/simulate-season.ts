import {
  cloneDecisions,
  createStartingState,
  DEFAULT_CONFIG,
  DEFAULT_DECISIONS,
  hashSeed,
  simulateTurn,
  stableHash,
} from "@/lib/engine";

let state = createStartingState(DEFAULT_CONFIG);
const results = [];
for (let month = 1; month <= 12 && !state.insolvent; month += 1) {
  const decisions = cloneDecisions(state.previousDecisions ?? DEFAULT_DECISIONS);
  decisions.pricing.price = month > 9 ? 32000 : 30000;
  decisions.marketing = { social: 220000, influencers: 120000, search: 140000, offline: 45000 };
  decisions.inventory.orderUnits = state.inventory < 650 ? 850 : 450;
  decisions.customerExperience.investment = 110000;
  const result = simulateTurn(state, decisions, DEFAULT_CONFIG, {
    player: hashSeed(`cli-practice:${month}`),
    event: hashSeed(`cli-season:event:${month}`),
  });
  results.push({ month, score: result.outcome.score, revenue: result.outcome.revenue, operatingProfit: result.outcome.operatingProfit, cash: result.outcome.cash, customers: result.outcome.activeCustomers, events: result.events.map((event) => event.key) });
  state = result.nextState;
}
console.table(results);
console.log(JSON.stringify({ turns: results.length, averageScore: state.cumulativeScore, finalCash: state.cash, finalDebt: state.debt, finalCustomers: state.activeCustomers, finalInventory: state.inventory, outputHash: stableHash(results) }, null, 2));
