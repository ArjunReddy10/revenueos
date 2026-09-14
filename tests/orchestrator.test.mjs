import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { SimulatedWallet } from "../lib/wallet.ts";
import { RevenueOrchestrator } from "../lib/orchestrator.ts";

function signal(overrides = {}) {
  return {
    id: "opp-main",
    title: "Small digital research product",
    description:
      "Test simulated demand for a narrow paid research product.",
    category: "digital product",
    segment: "Small business",
    estimatedCostCents: 200,
    estimatedRevenueCents: 800,
    estimatedTimeHours: 2,
    confidence: 0.8,
    risk: "low",
    evidence: [
      {
        source: "fixture-demand-data",
        note: "Simulated repeated buyer-interest signal",
      },
    ],
    ...overrides,
  };
}

function setup() {
  const dir = mkdtempSync(
    join(tmpdir(), "revenueos-orchestrator-")
  );

  const wallet = new SimulatedWallet(
    join(dir, "wallet.sqlite")
  );

  wallet.create("test", 5000);

  return {
    dir,
    wallet,
    orchestrator: new RevenueOrchestrator(
      wallet,
      "test"
    ),
  };
}

function cleanup(dir, wallet) {
  wallet.close();

  rmSync(dir, {
    recursive: true,
    force: true,
  });
}

test("full profitable revenue cycle selects, spends, earns and scales", () => {
  const { dir, wallet, orchestrator } = setup();

  try {
    const result = orchestrator.runCycle({
      signals: [
        signal({
          id: "weak",
          estimatedRevenueCents: 400,
          confidence: 0.55,
          risk: "medium",
        }),
        signal({
          id: "winner",
          estimatedRevenueCents: 800,
          confidence: 0.9,
          risk: "low",
        }),
      ],
      approved: true,
      outcome: {
        actualSpendCents: 200,
        revenueCents: 800,
      },
    });

    assert.equal(result.status, "EVALUATED");
    assert.equal(result.opportunity.id, "winner");
    assert.equal(
      result.experiment.status,
      "EVALUATED"
    );
    assert.equal(
      result.experiment.evaluation.decision,
      "SCALE"
    );

    assert.equal(result.wallet.totalSpent, 200);
    assert.equal(result.wallet.totalRevenue, 800);
    assert.equal(result.wallet.realizedProfit, 600);
    assert.equal(result.wallet.currentValue, 5600);
    assert.equal(result.wallet.reservedCapital, 0);

    const eventTypes = result.ledger.map(
      (event) => event.type
    );

    assert.ok(eventTypes.includes("RESERVE"));
    assert.ok(eventTypes.includes("EXPERIMENT_SPEND"));
    assert.ok(eventTypes.includes("REVENUE"));
  } finally {
    cleanup(dir, wallet);
  }
});

test("losing cycle is killed by survival engine", () => {
  const { dir, wallet, orchestrator } = setup();

  try {
    const result = orchestrator.runCycle({
      signals: [signal()],
      approved: true,
      outcome: {
        actualSpendCents: 200,
        revenueCents: 0,
      },
    });

    assert.equal(result.status, "EVALUATED");
    assert.equal(
      result.experiment.evaluation.decision,
      "KILL"
    );

    assert.equal(result.wallet.totalSpent, 200);
    assert.equal(result.wallet.totalRevenue, 0);
    assert.equal(result.wallet.realizedProfit, -200);
  } finally {
    cleanup(dir, wallet);
  }
});

test("human rejection prevents reservation and spending", () => {
  const { dir, wallet, orchestrator } = setup();

  try {
    const result = orchestrator.runCycle({
      signals: [signal()],
      approved: false,
    });

    assert.equal(result.status, "REJECTED");
    assert.equal(
      result.experiment.status,
      "REJECTED"
    );

    assert.equal(result.wallet.totalSpent, 0);
    assert.equal(result.wallet.reservedCapital, 0);
    assert.equal(result.wallet.currentValue, 5000);

    assert.equal(result.ledger.length, 1);
    assert.equal(result.ledger[0].type, "DEPOSIT");
  } finally {
    cleanup(dir, wallet);
  }
});

test("profitable-looking signal still waits when no outcome is supplied", () => {
  const { dir, wallet, orchestrator } = setup();

  try {
    const result = orchestrator.runCycle({
      signals: [signal()],
      approved: true,
    });

    assert.equal(
      result.status,
      "AWAITING_APPROVAL"
    );

    assert.equal(
      result.experiment.status,
      "PROPOSED"
    );

    assert.equal(result.wallet.totalSpent, 0);
    assert.equal(result.wallet.reservedCapital, 0);
  } finally {
    cleanup(dir, wallet);
  }
});

test("no economically valid opportunity means no experiment", () => {
  const { dir, wallet, orchestrator } = setup();

  try {
    const result = orchestrator.runCycle({
      signals: [
        signal({
          id: "bad-economics",
          estimatedCostCents: 300,
          estimatedRevenueCents: 100,
        }),
      ],
      approved: true,
      outcome: {
        actualSpendCents: 300,
        revenueCents: 100,
      },
    });

    assert.equal(
      result.status,
      "NO_OPPORTUNITY"
    );

    assert.equal(result.opportunity, null);
    assert.equal(result.experiment, null);
    assert.equal(result.wallet.totalSpent, 0);
  } finally {
    cleanup(dir, wallet);
  }
});

test("orchestrator cannot bypass wallet experiment limit", () => {
  const { dir, wallet, orchestrator } = setup();

  try {
    const result = orchestrator.runCycle({
      signals: [
        signal({
          id: "large-market-test",
          estimatedCostCents: 1000,
          estimatedRevenueCents: 3000,
        }),
      ],
      approved: true,
      outcome: {
        actualSpendCents: 300,
        revenueCents: 600,
      },
    });

    assert.equal(
      result.experiment.budget,
      300
    );

    assert.equal(
      result.wallet.totalSpent,
      300
    );
  } finally {
    cleanup(dir, wallet);
  }
});

test("orchestrator rejects actual spend above approved budget", () => {
  const { dir, wallet, orchestrator } = setup();

  try {
    assert.throws(() =>
      orchestrator.runCycle({
        signals: [
          signal({
            estimatedCostCents: 200,
          }),
        ],
        approved: true,
        outcome: {
          actualSpendCents: 201,
          revenueCents: 500,
        },
      })
    );

    const snapshot = wallet.snapshot("test");

    assert.equal(snapshot.totalSpent, 0);
    assert.equal(snapshot.totalRevenue, 0);
  } finally {
    cleanup(dir, wallet);
  }
});
