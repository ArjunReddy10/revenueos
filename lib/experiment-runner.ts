import { SimulatedWallet } from "./wallet.ts";
import {
  evaluateSurvival,
  type SurvivalEvaluation,
} from "./survival.ts";

export type ExperimentStatus =
  | "PROPOSED"
  | "APPROVED"
  | "RUNNING"
  | "COMPLETED"
  | "EVALUATED"
  | "REJECTED";

export interface RevenueExperiment {
  id: string;
  name: string;
  status: ExperimentStatus;
  budget: number;
  actualSpend: number;
  revenue: number;
  confidence: number;
  completedExperiments: number;
  consecutiveLosses: number;
  reservationId: string | null;
  spendEventId: string | null;
  evaluation: SurvivalEvaluation | null;
}

export class ExperimentRunner {
  private wallet: SimulatedWallet;
  private walletId: string;

  constructor(wallet: SimulatedWallet, walletId: string) {
    this.wallet = wallet;
    this.walletId = walletId;
  }

  propose(input: {
    id: string;
    name: string;
    budget: number;
    confidence?: number;
    completedExperiments?: number;
    consecutiveLosses?: number;
  }): RevenueExperiment {
    if (!input.id.trim()) throw new Error("Experiment ID is required");
    if (!input.name.trim()) throw new Error("Experiment name is required");

    if (
      !Number.isSafeInteger(input.budget) ||
      input.budget <= 0 ||
      input.budget > 300
    ) {
      throw new Error(
        "Experiment budget must be positive integer cents and at most $3"
      );
    }

    const confidence = input.confidence ?? 0.5;

    if (
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1
    ) {
      throw new Error("Confidence must be between 0 and 1");
    }

    return {
      id: input.id,
      name: input.name,
      status: "PROPOSED",
      budget: input.budget,
      actualSpend: 0,
      revenue: 0,
      confidence,
      completedExperiments: input.completedExperiments ?? 0,
      consecutiveLosses: input.consecutiveLosses ?? 0,
      reservationId: null,
      spendEventId: null,
      evaluation: null,
    };
  }

  approve(experiment: RevenueExperiment): RevenueExperiment {
    this.requireStatus(experiment, "PROPOSED");

    const reservation = this.wallet.post(this.walletId, {
      type: "RESERVE",
      amount: experiment.budget,
      experimentId: experiment.id,
      evidence: `Approved simulated experiment: ${experiment.name}`,
      requestKey: `experiment:${experiment.id}:reserve`,
    });

    return {
      ...experiment,
      status: "APPROVED",
      reservationId: reservation.id,
    };
  }

  reject(experiment: RevenueExperiment): RevenueExperiment {
    this.requireStatus(experiment, "PROPOSED");

    return {
      ...experiment,
      status: "REJECTED",
    };
  }

  start(experiment: RevenueExperiment): RevenueExperiment {
    this.requireStatus(experiment, "APPROVED");

    if (!experiment.reservationId) {
      throw new Error("Approved experiment has no reservation");
    }

    return {
      ...experiment,
      status: "RUNNING",
    };
  }

  complete(
    experiment: RevenueExperiment,
    actualSpend: number,
    revenue: number
  ): RevenueExperiment {
    this.requireStatus(experiment, "RUNNING");

    if (!experiment.reservationId) {
      throw new Error("Running experiment has no reservation");
    }

    if (
      !Number.isSafeInteger(actualSpend) ||
      actualSpend <= 0 ||
      actualSpend > experiment.budget
    ) {
      throw new Error(
        "Actual spend must be positive integer cents within approved budget"
      );
    }

    if (
      !Number.isSafeInteger(revenue) ||
      revenue < 0
    ) {
      throw new Error("Revenue must be non-negative integer cents");
    }

    const spendEvent = this.wallet.post(this.walletId, {
      type: "EXPERIMENT_SPEND",
      amount: actualSpend,
      experimentId: experiment.id,
      referenceId: experiment.reservationId,
      evidence: `Simulated experiment completed: ${experiment.name}`,
      requestKey: `experiment:${experiment.id}:spend`,
    });

    if (revenue > 0) {
      this.wallet.post(this.walletId, {
        type: "REVENUE",
        amount: revenue,
        experimentId: experiment.id,
        evidence: `Simulated revenue attributed to: ${experiment.name}`,
        requestKey: `experiment:${experiment.id}:revenue`,
      });
    }

    return {
      ...experiment,
      status: "COMPLETED",
      actualSpend,
      revenue,
      spendEventId: spendEvent.id,
    };
  }

  evaluate(experiment: RevenueExperiment): RevenueExperiment {
    this.requireStatus(experiment, "COMPLETED");

    const evaluation = evaluateSurvival({
      spend: experiment.actualSpend / 100,
      revenue: experiment.revenue / 100,
      confidence: experiment.confidence,
      completedExperiments: experiment.completedExperiments + 1,
      consecutiveLosses:
        experiment.revenue < experiment.actualSpend
          ? experiment.consecutiveLosses + 1
          : 0,
    });

    return {
      ...experiment,
      status: "EVALUATED",
      completedExperiments: experiment.completedExperiments + 1,
      consecutiveLosses:
        experiment.revenue < experiment.actualSpend
          ? experiment.consecutiveLosses + 1
          : 0,
      evaluation,
    };
  }

  runSimulation(
    input: {
      id: string;
      name: string;
      budget: number;
      confidence?: number;
      completedExperiments?: number;
      consecutiveLosses?: number;
    },
    actualSpend: number,
    revenue: number
  ): RevenueExperiment {
    let experiment = this.propose(input);
    experiment = this.approve(experiment);
    experiment = this.start(experiment);
    experiment = this.complete(experiment, actualSpend, revenue);
    experiment = this.evaluate(experiment);
    return experiment;
  }

  private requireStatus(
    experiment: RevenueExperiment,
    expected: ExperimentStatus
  ) {
    if (experiment.status !== expected) {
      throw new Error(
        `Experiment must be ${expected}; current status is ${experiment.status}`
      );
    }
  }
}
