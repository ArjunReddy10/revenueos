export type StrategyState =
  | "DISCOVERED"
  | "RESEARCHING"
  | "TESTING"
  | "PROFITABLE"
  | "SCALING"
  | "PAUSED"
  | "KILLED";

export type SurvivalDecision =
  | "KILL"
  | "CONTINUE"
  | "SCALE"
  | "REVIEW";

export interface SurvivalEvaluationInput {
  spend: number;
  revenue: number;
  confidence: number;
  completedExperiments: number;
  consecutiveLosses: number;
  violations?: number;
}

export interface SurvivalEvaluation {
  state: StrategyState;
  decision: SurvivalDecision;
  profit: number;
  roi: number | null;
  reason: string;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 10000) / 10000;
}

/**
 * Deterministic economic decision engine.
 *
 * The LLM may explain or recommend,
 * but this function controls strategy survival decisions.
 */
export function evaluateSurvival(
  input: SurvivalEvaluationInput
): SurvivalEvaluation {
  const {
    spend,
    revenue,
    confidence,
    completedExperiments,
    consecutiveLosses,
    violations = 0,
  } = input;

  if (
    !Number.isFinite(spend) ||
    !Number.isFinite(revenue) ||
    !Number.isFinite(confidence) ||
    spend < 0 ||
    revenue < 0 ||
    confidence < 0 ||
    confidence > 1 ||
    completedExperiments < 0 ||
    consecutiveLosses < 0 ||
    violations < 0
  ) {
    throw new Error("Invalid survival evaluation input");
  }

  const profit = roundMoney(revenue - spend);
  const roi = spend > 0 ? roundPercent(profit / spend) : null;

  // Safety violations always stop autonomous spending.
  if (violations > 0) {
    return {
      state: "KILLED",
      decision: "KILL",
      profit,
      roi,
      reason: "Strategy has policy or safety violations.",
    };
  }

  // Nothing has actually been tested yet.
  if (completedExperiments === 0) {
    return {
      state: "DISCOVERED",
      decision: "REVIEW",
      profit,
      roi,
      reason: "No completed experiment evidence yet.",
    };
  }

  // Repeated losses mean the strategy loses its right to spend.
  if (consecutiveLosses >= 2) {
    return {
      state: "KILLED",
      decision: "KILL",
      profit,
      roi,
      reason: "Two or more consecutive losing experiments.",
    };
  }

  // Severe loss on deployed capital.
  if (roi !== null && roi <= -0.5) {
    return {
      state: "KILLED",
      decision: "KILL",
      profit,
      roi,
      reason: "Experiment lost at least 50% of deployed capital.",
    };
  }

  // Strong positive economics + sufficient evidence.
  if (
    profit > 0 &&
    roi !== null &&
    roi >= 0.5 &&
    confidence >= 0.65
  ) {
    return {
      state: "SCALING",
      decision: "SCALE",
      profit,
      roi,
      reason: "Positive profit, strong ROI and sufficient confidence.",
    };
  }

  // Positive or break-even result with reasonable confidence.
  if (profit >= 0 && confidence >= 0.5) {
    return {
      state: profit > 0 ? "PROFITABLE" : "TESTING",
      decision: "CONTINUE",
      profit,
      roi,
      reason: "Economics justify another bounded experiment.",
    };
  }

  // Insufficient evidence: do not scale or automatically kill.
  return {
    state: "PAUSED",
    decision: "REVIEW",
    profit,
    roi,
    reason: "Evidence is insufficient for an autonomous decision.",
  };
}
