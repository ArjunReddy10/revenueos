import type {
  ChannelAdapter,
  ChannelOpportunity,
  ExecutionEvidence,
  PreparedAction,
} from "./types.ts";

export class BusinessChannelAdapter
  implements ChannelAdapter
{
  readonly kind = "BUSINESS" as const;

  prepareAction(
    opportunity: ChannelOpportunity
  ): PreparedAction {
    if (opportunity.channel !== this.kind) {
      throw new Error(
        "Business adapter requires BUSINESS opportunity"
      );
    }

    if (!opportunity.evidence.length) {
      throw new Error(
        "Business opportunity requires evidence"
      );
    }

    if (
      !Number.isSafeInteger(
        opportunity.estimatedCostCents
      ) ||
      opportunity.estimatedCostCents < 0
    ) {
      throw new Error(
        "Estimated cost must be non-negative integer cents"
      );
    }

    return {
      id: `action-${opportunity.id}`,
      opportunityId: opportunity.id,
      channel: this.kind,
      title: `Prepare offer: ${opportunity.title}`,
      instructions:
        "Prepare a tailored business offer and outreach draft. Do not send without explicit human approval.",
      estimatedCostCents:
        opportunity.estimatedCostCents,
      requiresApproval: true,
      status: "PROPOSED",
    };
  }

  executeApprovedAction(
    action: PreparedAction,
    approved: boolean
  ): ExecutionEvidence {
    if (action.channel !== this.kind) {
      throw new Error(
        "Business adapter received wrong channel action"
      );
    }

    if (!approved) {
      return {
        actionId: action.id,
        channel: this.kind,
        executed: false,
        externalReference: null,
        evidence: [
          "Execution blocked because human approval was not provided.",
        ],
      };
    }

    return {
      actionId: action.id,
      channel: this.kind,
      executed: true,
      externalReference: `local-business-${action.id}`,
      evidence: [
        "Approved business action executed in local adapter mode.",
        "No external message, payment, or third-party side effect was sent by this adapter.",
      ],
    };
  }
}
