import assert from "node:assert/strict";
import test from "node:test";
import {
  cloneDecisions,
  createStartingState,
  DEFAULT_CONFIG,
  DEFAULT_DECISIONS,
  hashSeed,
  simulateTurn,
  stableHash,
  type Decisions,
  type GameState,
} from "@/lib/engine";

function assertFiniteTree(value: unknown, path = "root") {
  if (typeof value === "number") assert.ok(Number.isFinite(value), `${path} must be finite`);
  if (Array.isArray(value)) value.forEach((entry, index) => assertFiniteTree(entry, `${path}[${index}]`));
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) assertFiniteTree(entry, `${path}.${key}`);
  }
}

function simulateSeason(): { state: GameState; log: unknown[] } {
  let state = createStartingState(DEFAULT_CONFIG);
  const log: unknown[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const decisions = cloneDecisions(DEFAULT_DECISIONS);
    decisions.pricing.price = [30000, 31000, 29500, 30000, 32000, 31500, 30000, 28500, 30000, 31000, 32500, 33000][month - 1];
    decisions.marketing = { social: 220000, influencers: 120000, search: 140000, offline: 45000 };
    decisions.inventory.orderUnits = state.inventory < 650 ? 850 : 450;
    decisions.customerExperience.investment = 110000;
    const result = simulateTurn(state, decisions, DEFAULT_CONFIG, {
      player: hashSeed(`golden-player:${month}`),
      event: hashSeed(`golden-season:events:${month}`),
    });
    assertFiniteTree(result, `month${month}`);
    assert.ok(result.nextState.inventory >= 0, `month ${month}: inventory cannot be negative`);
    assert.ok(result.nextState.activeCustomers >= 0, `month ${month}: customers cannot be negative`);
    assert.ok(result.nextState.salesStaff >= 0 && result.nextState.opsStaff >= 0, `month ${month}: staff cannot be negative`);
    assert.ok(result.nextState.cash >= 0 && result.nextState.debt >= 0, `month ${month}: cash and debt cannot be negative`);
    assert.ok(result.outcome.score >= 0 && result.outcome.score <= 1000, `month ${month}: score must be bounded`);
    assert.equal(result.nextState.month, month);
    log.push({ state, decisions, result });
    state = result.nextState;
  }
  return { state, log };
}

test("same state, decisions, rule version and seeds produce identical hashes", () => {
  const state = createStartingState();
  const decisions = cloneDecisions(DEFAULT_DECISIONS);
  const seed = { player: 3184281, event: 76104 };
  const left = simulateTurn(state, decisions, DEFAULT_CONFIG, seed);
  const right = simulateTurn(state, decisions, DEFAULT_CONFIG, seed);
  assert.equal(stableHash(left), stableHash(right));
});

test("the same season event seed gives every player the same event list", () => {
  const state = createStartingState();
  const first = simulateTurn(state, DEFAULT_DECISIONS, DEFAULT_CONFIG, { player: 111, event: 90210 });
  const second = simulateTurn(state, DEFAULT_DECISIONS, DEFAULT_CONFIG, { player: 987654, event: 90210 });
  assert.deepEqual(first.events, second.events);
});

test("extreme legal decisions preserve non-negative state and finite outputs", () => {
  const state = createStartingState();
  const decisions: Decisions = {
    ...cloneDecisions(DEFAULT_DECISIONS),
    pricing: { price: 60000, discount: 0.4 },
    marketing: { social: 0, influencers: 0, search: 0, offline: 0 },
    sales: { staffChange: -4, commission: 0.15 },
    operations: { staffChange: 0, salaryLevel: "above" },
    inventory: { orderUnits: 0, safetyStock: 0 },
    finance: { draw: 0, repay: 0 },
    customerExperience: { investment: 0 },
  };
  const result = simulateTurn(state, decisions, DEFAULT_CONFIG, { player: 99, event: 101 });
  assertFiniteTree(result);
  assert.ok(result.nextState.inventory >= 0);
  assert.ok(result.nextState.activeCustomers >= 0);
  assert.ok(result.nextState.salesStaff >= 0);
  assert.ok(result.nextState.cash >= 0);
  assert.ok(result.nextState.debt >= 0);
  assert.ok(result.outcome.fulfilled <= result.outcome.demand + 1);
});

test("a 12-month season stays finite and completes with bounded scores", () => {
  const { state, log } = simulateSeason();
  assert.equal(log.length, 12);
  assert.equal(state.month, 12);
  assert.ok(state.inventory >= 0);
  assert.ok(state.activeCustomers >= 0);
  assert.ok(state.cash >= 0);
  assert.ok(state.debt >= 0);
  assert.ok(log.every((entry) => {
    const month = entry as { result: { outcome: { score: number }; nextState: GameState } };
    return month.result.outcome.score >= 0 && month.result.outcome.score <= 1000 && month.result.nextState.month > 0;
  }));
  assert.equal(stableHash(log), "4449db3e4201c977");
});
