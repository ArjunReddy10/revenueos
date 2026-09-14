import type { Risk } from "../types.ts";

export type ChannelKind =
  | "BUSINESS"
  | "DIGITAL_PRODUCT"
  | "CONTENT"
  | "MARKET_RESEARCH";

export type ActionStatus =
  | "PROPOSED"
  | "APPROVED"
  | "EXECUTED"
  | "FAILED";

export interface ChannelOpportunity {
  id: string;
  channel: ChannelKind;
  title: string;
  description: string;
  estimatedCostCents: number;
  estimatedRevenueCents: number;
  confidence: number;
  risk: Risk;
  evidence: string[];
}

export interface PreparedAction {
  id: string;
  opportunityId: string;
  channel: ChannelKind;
  title: string;
  instructions: string;
  estimatedCostCents: number;
  requiresApproval: true;
  status: ActionStatus;
}

export interface ExecutionEvidence {
  actionId: string;
  channel: ChannelKind;
  executed: boolean;
  externalReference: string | null;
  evidence: string[];
}

export interface RevenueEvidence {
  source: string;
  externalReference: string;
  amountCents: number;
  currency: "USD";
  receivedAt: string;
}

export interface RevenueVerification {
  verified: boolean;
  amountCents: number;
  reason: string;
  evidence: RevenueEvidence | null;
}

export interface ChannelAdapter {
  kind: ChannelKind;

  prepareAction(
    opportunity: ChannelOpportunity
  ): PreparedAction;

  executeApprovedAction(
    action: PreparedAction,
    approved: boolean
  ): ExecutionEvidence;
}
