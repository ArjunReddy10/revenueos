import type { Opportunity, Risk } from "./types.ts";

export interface OpportunityEvidence {
  source: string;
  note: string;
}

export interface RawOpportunitySignal {
  id: string;
  title: string;
  description: string;
  category: string;
  segment: string;
  estimatedCostCents: number;
  estimatedRevenueCents: number;
  estimatedTimeHours: number;
  confidence: number;
  risk: Risk;
  evidence: OpportunityEvidence[];
}

export interface RecommendedExperiment {
  name: string;
  hypothesis: string;
  budgetCents: number;
  successMetric: string;
}

export interface ScoutedOpportunity extends RawOpportunitySignal {
  expectedProfitCents: number;
  expectedRoi: number | null;
  score: number;
  recommendedExperiment: RecommendedExperiment;
}

const BLOCKED_CATEGORIES = new Set([
  "gambling",
  "sports betting",
  "casino",
  "leveraged trading",
  "crypto trading",
  "stock trading",
  "debt arbitrage",
  "fake engagement",
  "deceptive spam",
]);

function required(value: string, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
}

function validateMoney(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be non-negative integer cents`);
  }
}

function riskPenalty(risk: Risk) {
  if (risk === "low") return 0;
  if (risk === "medium") return 12;
  return 30;
}

export function scoutOpportunity(
  signal: RawOpportunitySignal
): ScoutedOpportunity {
  required(signal.id, "Opportunity ID");
  required(signal.title, "Title");
  required(signal.description, "Description");
  required(signal.category, "Category");
  required(signal.segment, "Segment");

  validateMoney(signal.estimatedCostCents, "Estimated cost");
  validateMoney(signal.estimatedRevenueCents, "Estimated revenue");

  if (
    !Number.isFinite(signal.estimatedTimeHours) ||
    signal.estimatedTimeHours <= 0
  ) {
    throw new Error("Estimated time must be positive");
  }

  if (
    !Number.isFinite(signal.confidence) ||
    signal.confidence < 0 ||
    signal.confidence > 1
  ) {
    throw new Error("Confidence must be between 0 and 1");
  }

  const normalizedCategory = signal.category.trim().toLowerCase();

  if (BLOCKED_CATEGORIES.has(normalizedCategory)) {
    throw new Error("Opportunity category is not permitted");
  }

  if (!signal.evidence.length) {
    throw new Error("At least one evidence item is required");
  }

  for (const item of signal.evidence) {
    required(item.source, "Evidence source");
    required(item.note, "Evidence note");
  }

  const expectedProfitCents =
    signal.estimatedRevenueCents - signal.estimatedCostCents;

  const expectedRoi =
    signal.estimatedCostCents > 0
      ? expectedProfitCents / signal.estimatedCostCents
      : null;

  const profitSignal = Math.max(
    0,
    Math.min(35, expectedProfitCents / 20)
  );

  const confidenceSignal = signal.confidence * 30;

  const roiSignal =
    expectedRoi === null
      ? 8
      : Math.max(0, Math.min(25, expectedRoi * 12.5));

  const timePenalty = Math.min(15, signal.estimatedTimeHours * 1.5);

  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        25 +
          profitSignal +
          confidenceSignal +
          roiSignal -
          riskPenalty(signal.risk) -
          timePenalty
      )
    )
  );

  const budgetCents = Math.max(
    1,
    Math.min(300, Math.max(1, signal.estimatedCostCents))
  );

  return {
    ...signal,
    expectedProfitCents,
    expectedRoi,
    score,
    recommendedExperiment: {
      name: `Test: ${signal.title}`,
      hypothesis: signal.description,
      budgetCents,
      successMetric:
        "Verified simulated revenue exceeds experiment spend",
    },
  };
}

export function rankOpportunities(
  signals: RawOpportunitySignal[]
): ScoutedOpportunity[] {
  return signals
    .map(scoutOpportunity)
    .filter((opportunity) => opportunity.expectedProfitCents >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return b.expectedProfitCents - a.expectedProfitCents;
    });
}

export function selectBestOpportunity(
  signals: RawOpportunitySignal[]
): ScoutedOpportunity | null {
  return rankOpportunities(signals)[0] ?? null;
}

export function toExperimentProposal(opportunity: ScoutedOpportunity) {
  return {
    id: `exp-${opportunity.id}`,
    name: opportunity.recommendedExperiment.name,
    budget: opportunity.recommendedExperiment.budgetCents,
    confidence: opportunity.confidence,
    completedExperiments: 0,
    consecutiveLosses: 0,
  };
}

export function toUiOpportunity(
  opportunity: ScoutedOpportunity
): Opportunity {
  return {
    id: opportunity.id,
    title: opportunity.title,
    segment: opportunity.segment,
    stage: "qualified",
    value: opportunity.estimatedRevenueCents / 100,
    probability: Math.round(opportunity.confidence * 100),
    confidence: opportunity.confidence,
    effort: Math.max(
      1,
      Math.min(5, Math.ceil(opportunity.estimatedTimeHours / 2))
    ),
    risk: opportunity.risk,
    owner: "Revenue OS Scout",
    agentId: "opportunity-scout",
    createdAt: new Date().toISOString().slice(0, 10),
    summary: opportunity.description,
    x: 50,
    y: 50,
  };
}
