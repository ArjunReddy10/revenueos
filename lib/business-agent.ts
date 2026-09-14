import type {
  ChannelOpportunity,
  PreparedAction,
} from "./channels/types.ts";

import {
  getChannelAdapter,
} from "./channels/registry.ts";

export interface BusinessProspect {
  id: string;
  businessName: string;
  website: string;
  segment: string;
  source: string;
  problemSignals: string[];
  estimatedValueCents: number;
  confidence: number;
}

export interface BusinessOffer {
  prospectId: string;
  businessName: string;
  score: number;
  title: string;
  priceCents: number;
  deliverables: string[];
  outreachDraft: string;
  opportunity: ChannelOpportunity;
  action: PreparedAction;
  requiresHumanApproval: true;
}

function required(value: string, field: string) {
  if (!value || !value.trim()) {
    throw new Error(`${field} is required`);
  }
}

export function scoreBusinessProspect(
  prospect: BusinessProspect
): number {
  required(prospect.businessName, "Business name");
  required(prospect.website, "Website");
  required(prospect.source, "Source");

  if (!prospect.problemSignals.length) {
    return 0;
  }

  if (
    !Number.isFinite(prospect.confidence) ||
    prospect.confidence < 0 ||
    prospect.confidence > 1
  ) {
    throw new Error(
      "Confidence must be between 0 and 1"
    );
  }

  if (
    !Number.isSafeInteger(
      prospect.estimatedValueCents
    ) ||
    prospect.estimatedValueCents < 0
  ) {
    throw new Error(
      "Estimated value must be non-negative integer cents"
    );
  }

  const problemScore = Math.min(
    40,
    prospect.problemSignals.length * 12
  );

  const confidenceScore =
    prospect.confidence * 35;

  const valueScore = Math.min(
    25,
    prospect.estimatedValueCents / 2000
  );

  return Math.round(
    Math.min(
      100,
      problemScore +
        confidenceScore +
        valueScore
    )
  );
}

export function buildBusinessOffer(
  prospect: BusinessProspect
): BusinessOffer {
  const score =
    scoreBusinessProspect(prospect);

  if (score < 45) {
    throw new Error(
      "Prospect does not meet minimum opportunity score"
    );
  }

  const primaryProblem =
    prospect.problemSignals[0];

  const priceCents = Math.max(
    2500,
    Math.min(
      15000,
      Math.round(
        prospect.estimatedValueCents * 0.15
      )
    )
  );

  const opportunity: ChannelOpportunity = {
    id: `business-${prospect.id}`,
    channel: "BUSINESS",
    title:
      `${prospect.businessName} revenue improvement`,
    description:
      `Address observed issue: ${primaryProblem}`,
    estimatedCostCents: 0,
    estimatedRevenueCents: priceCents,
    confidence: prospect.confidence,
    risk: "low",
    evidence:
      prospect.problemSignals.map(
        (signal) =>
          `${prospect.source}: ${signal}`
      ),
  };

  const adapter =
    getChannelAdapter("BUSINESS");

  const action =
    adapter.prepareAction(opportunity);

  return {
    prospectId: prospect.id,
    businessName: prospect.businessName,
    score,
    title:
      `Revenue improvement audit for ${prospect.businessName}`,
    priceCents,
    deliverables: [
      `Review: ${primaryProblem}`,
      "Identify the highest-impact conversion issue",
      "Provide prioritized fixes",
      "Deliver a concise implementation plan",
    ],
    outreachDraft:
      `Hi ${prospect.businessName} team — I reviewed your public website and noticed ${primaryProblem}. I work on software and revenue automation, and I can put together a focused audit showing the highest-impact fixes and an implementation plan. If useful, I can send over a short outline first. No obligation.`,
    opportunity,
    action,
    requiresHumanApproval: true,
  };
}

export function rankBusinessProspects(
  prospects: BusinessProspect[]
): BusinessProspect[] {
  return [...prospects]
    .filter(
      (prospect) =>
        prospect.problemSignals.length > 0
    )
    .sort(
      (a, b) =>
        scoreBusinessProspect(b) -
        scoreBusinessProspect(a)
    );
}

export function selectBestBusinessProspect(
  prospects: BusinessProspect[]
): BusinessProspect | null {
  return (
    rankBusinessProspects(prospects)[0] ??
    null
  );
}
