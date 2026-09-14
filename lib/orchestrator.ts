import {
  selectBestOpportunity,
  toExperimentProposal,
  type RawOpportunitySignal,
  type ScoutedOpportunity,
} from "./opportunity-scout.ts";

import {
  ExperimentRunner,
  type RevenueExperiment,
} from "./experiment-runner.ts";

import {
  SimulatedWallet,
  type LedgerEvent,
  type WalletSnapshot,
} from "./wallet.ts";

export interface SimulationOutcome {
  actualSpendCents: number;
  revenueCents: number;
}

export interface RevenueCycleInput {
  signals: RawOpportunitySignal[];
  approved: boolean;
  outcome?: SimulationOutcome;
}

export type RevenueCycleStatus =
  | "NO_OPPORTUNITY"
  | "AWAITING_APPROVAL"
  | "REJECTED"
  | "EVALUATED";

export interface RevenueCycleResult {
  status: RevenueCycleStatus;
  opportunity: ScoutedOpportunity | null;
  experiment: RevenueExperiment | null;
  wallet: WalletSnapshot;
  ledger: LedgerEvent[];
}

export class RevenueOrchestrator {
  private wallet: SimulatedWallet;
  private walletId: string;
  private runner: ExperimentRunner;

  constructor(wallet: SimulatedWallet, walletId: string) {
    this.wallet = wallet;
    this.walletId = walletId;
    this.runner = new ExperimentRunner(wallet, walletId);
  }

  runCycle(input: RevenueCycleInput): RevenueCycleResult {
    const opportunity = selectBestOpportunity(input.signals);

    if (!opportunity) {
      return this.result(
        "NO_OPPORTUNITY",
        null,
        null
      );
    }

    const proposal = toExperimentProposal(opportunity);
    let experiment = this.runner.propose(proposal);

    if (!input.approved) {
      experiment = this.runner.reject(experiment);

      return this.result(
        "REJECTED",
        opportunity,
        experiment
      );
    }

    if (!input.outcome) {
      return this.result(
        "AWAITING_APPROVAL",
        opportunity,
        experiment
      );
    }

    experiment = this.runner.approve(experiment);
    experiment = this.runner.start(experiment);

    experiment = this.runner.complete(
      experiment,
      input.outcome.actualSpendCents,
      input.outcome.revenueCents
    );

    experiment = this.runner.evaluate(experiment);

    return this.result(
      "EVALUATED",
      opportunity,
      experiment
    );
  }

  private result(
    status: RevenueCycleStatus,
    opportunity: ScoutedOpportunity | null,
    experiment: RevenueExperiment | null
  ): RevenueCycleResult {
    return {
      status,
      opportunity,
      experiment,
      wallet: this.wallet.snapshot(this.walletId),
      ledger: this.wallet.ledger(this.walletId),
    };
  }
}
