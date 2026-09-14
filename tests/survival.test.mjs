import test from "node:test";
import assert from "node:assert/strict";

import { evaluateSurvival } from "../lib/survival.ts";

test("profitable experiment scales", () => {
  const result = evaluateSurvival({
    spend: 3,
    revenue: 8,
    confidence: 0.8,
    completedExperiments: 1,
    consecutiveLosses: 0,
  });

  assert.equal(result.profit, 5);
  assert.equal(result.roi, 1.6667);
  assert.equal(result.decision, "SCALE");
  assert.equal(result.state, "SCALING");
});

test("large loss is killed", () => {
  const result = evaluateSurvival({
    spend: 3,
    revenue: 0,
    confidence: 0.8,
    completedExperiments: 1,
    consecutiveLosses: 1,
  });

  assert.equal(result.profit, -3);
  assert.equal(result.roi, -1);
  assert.equal(result.decision, "KILL");
  assert.equal(result.state, "KILLED");
});

test("two consecutive losses kill strategy", () => {
  const result = evaluateSurvival({
    spend: 4,
    revenue: 3,
    confidence: 0.9,
    completedExperiments: 2,
    consecutiveLosses: 2,
  });

  assert.equal(result.decision, "KILL");
  assert.equal(result.state, "KILLED");
});

test("policy violation always kills", () => {
  const result = evaluateSurvival({
    spend: 3,
    revenue: 20,
    confidence: 1,
    completedExperiments: 3,
    consecutiveLosses: 0,
    violations: 1,
  });

  assert.equal(result.decision, "KILL");
});

test("no completed experiment requires review", () => {
  const result = evaluateSurvival({
    spend: 0,
    revenue: 0,
    confidence: 0.9,
    completedExperiments: 0,
    consecutiveLosses: 0,
  });

  assert.equal(result.decision, "REVIEW");
  assert.equal(result.state, "DISCOVERED");
});

test("small positive result can continue without scaling", () => {
  const result = evaluateSurvival({
    spend: 3,
    revenue: 3.5,
    confidence: 0.6,
    completedExperiments: 1,
    consecutiveLosses: 0,
  });

  assert.equal(result.profit, 0.5);
  assert.equal(result.decision, "CONTINUE");
  assert.equal(result.state, "PROFITABLE");
});

test("invalid inputs are rejected", () => {
  assert.throws(() =>
    evaluateSurvival({
      spend: -1,
      revenue: 0,
      confidence: 0.5,
      completedExperiments: 1,
      consecutiveLosses: 0,
    })
  );
});
