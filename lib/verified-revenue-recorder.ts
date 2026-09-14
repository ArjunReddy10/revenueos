import { SimulatedWallet } from "./wallet.ts";
import {
  verifyRevenue,
} from "./revenue-verifier.ts";
import type {
  RevenueEvidence,
} from "./channels/types.ts";

export interface RecordVerifiedRevenueInput {
  walletId: string;
  experimentId: string;
  evidence: RevenueEvidence | null;
}

export interface RecordVerifiedRevenueResult {
  recorded: boolean;
  amountCents: number;
  reason: string;
  ledgerEventId: string | null;
}

export function recordVerifiedRevenue(
  wallet: SimulatedWallet,
  input: RecordVerifiedRevenueInput
): RecordVerifiedRevenueResult {
  const verification =
    verifyRevenue(input.evidence);

  if (!verification.verified) {
    return {
      recorded: false,
      amountCents: 0,
      reason: verification.reason,
      ledgerEventId: null,
    };
  }

  if (!verification.evidence) {
    throw new Error(
      "Verified revenue must include evidence"
    );
  }

  const paymentRef =
    verification.evidence.externalReference;

  const event = wallet.post(
    input.walletId,
    {
      type: "REVENUE",
      amount: verification.amountCents,
      experimentId: input.experimentId,
      evidence:
        `Verified external revenue from ${verification.evidence.source}; reference ${paymentRef}`,
      requestKey:
        `verified-revenue:${paymentRef}`,
    }
  );

  return {
    recorded: true,
    amountCents: verification.amountCents,
    reason: verification.reason,
    ledgerEventId: event.id,
  };
}
