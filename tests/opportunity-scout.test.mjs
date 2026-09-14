import test from "node:test";
import assert from "node:assert/strict";

import {
  scoutOpportunity,
  rankOpportunities,
  selectBestOpportunity,
  toExperimentProposal,
  toUiOpportunity,
} from "../lib/opportunity-scout.ts";

function signal(overrides = {}) {
  return {
    id: "opp-1",
    title: "Small paid research report",
    description:
      "Test whether a narrow research report can generate simulated revenue.",
    category: "digital product",
    segment: "Small business",
    estimatedCostCents: 200,
    estimatedRevenueCents: 800,
    estimatedTimeHours: 2,
    confidence: 0.8,
    risk: "low",
    evidence: [
      {
        source: "fixture-demand-data",
        note: "Repeated demand signal in simulated dataset",
      },
    ],
    ...overrides,
  };
}

test("structured opportunity calculates economics", () => {
  const result = scoutOpportunity(signal());

  assert.equal(result.expectedProfitCents, 600);
  assert.equal(result.expectedRoi, 3);
  assert.ok(result.score > 0);
  assert.equal(result.recommendedExperiment.budgetCents, 200);
});

test("first experiment budget is capped at $3", () => {
  const result = scoutOpportunity(
    signal({
      estimatedCostCents: 900,
      estimatedRevenueCents: 2000,
    })
  );

  assert.equal(result.recommendedExperiment.budgetCents, 300);
});

test("opportunity without evidence is rejected", () => {
  assert.throws(() =>
    scoutOpportunity(
      signal({
        evidence: [],
      })
    )
  );
});

test("blocked financial or gambling category is rejected", () => {
  assert.throws(() =>
    scoutOpportunity(
      signal({
        category: "crypto trading",
      })
    )
  );
});

test("ranking prefers stronger economics and confidence", () => {
  const ranked = rankOpportunities([
    signal({
      id: "weak",
      estimatedRevenueCents: 300,
      confidence: 0.5,
      risk: "medium",
    }),
    signal({
      id: "strong",
      estimatedRevenueCents: 1000,
      confidence: 0.9,
      risk: "low",
    }),
  ]);

  assert.equal(ranked[0].id, "strong");
});

test("negative expected profit is not selected", () => {
  const selected = selectBestOpportunity([
    signal({
      id: "loss",
      estimatedCostCents: 300,
      estimatedRevenueCents: 100,
    }),
  ]);

  assert.equal(selected, null);
});

test("scouted opportunity converts into experiment proposal", () => {
  const opportunity = scoutOpportunity(signal());

  const experiment = toExperimentProposal(opportunity);

  assert.equal(experiment.id, "exp-opp-1");
  assert.equal(experiment.budget, 200);
  assert.equal(experiment.confidence, 0.8);
});

test("scouted opportunity maps to existing UI Opportunity type", () => {
  const opportunity = scoutOpportunity(signal());

  const ui = toUiOpportunity(opportunity);

  assert.equal(ui.id, "opp-1");
  assert.equal(ui.stage, "qualified");
  assert.equal(ui.risk, "low");
  assert.equal(ui.value, 8);
  assert.equal(ui.owner, "Revenue OS Scout");
});
