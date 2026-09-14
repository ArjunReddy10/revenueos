import type {
  RevenueEvidence,
  RevenueVerification,
} from "./channels/types.ts";

export function verifyRevenue(
  evidence: RevenueEvidence | null
): RevenueVerification {
  if (!evidence) {
    return {
      verified: false,
      amountCents: 0,
      reason:
        "No external payment evidence was supplied.",
      evidence: null,
    };
  }

  if (
    evidence.currency !== "USD" ||
    !Number.isSafeInteger(evidence.amountCents) ||
    evidence.amountCents <= 0
  ) {
    return {
      verified: false,
      amountCents: 0,
      reason:
        "Revenue evidence contains an invalid amount or currency.",
      evidence,
    };
  }

  if (
    !evidence.source.trim() ||
    !evidence.externalReference.trim() ||
    !evidence.receivedAt.trim()
  ) {
    return {
      verified: false,
      amountCents: 0,
      reason:
        "Revenue evidence is missing required external verification fields.",
      evidence,
    };
  }

  const timestamp = Date.parse(
    evidence.receivedAt
  );

  if (Number.isNaN(timestamp)) {
    return {
      verified: false,
      amountCents: 0,
      reason:
        "Revenue evidence has an invalid timestamp.",
      evidence,
    };
  }

  return {
    verified: true,
    amountCents: evidence.amountCents,
    reason:
      "External revenue evidence passed structural verification.",
    evidence,
  };
}
