import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { SimulatedWallet } from "../lib/wallet.ts";
import { ExperimentRunner } from "../lib/experiment-runner.ts";

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "revenueos-runner-"));
  const wallet = new SimulatedWallet(join(dir, "wallet.sqlite"));
  wallet.create("test", 5000);

  return {
    dir,
    wallet,
    runner: new ExperimentRunner(wallet, "test"),
  };
}

function cleanup(dir, wallet) {
  wallet.close();
  rmSync(dir, { recursive: true, force: true });
}

test("profitable simulation completes and scales", () => {
  const { dir, wallet, runner } = setup();

  try {
    const result = runner.runSimulation(
      {
        id: "exp-profit",
        name: "Profitable test",
        budget: 300,
        confidence: 0.8,
      },
      300,
      800
    );

    assert.equal(result.status, "EVALUATED");
    assert.equal(result.actualSpend, 300);
    assert.equal(result.revenue, 800);
    assert.equal(result.evaluation.decision, "SCALE");
    assert.equal(result.evaluation.profit, 5);

    const snapshot = wallet.snapshot("test");

    assert.equal(snapshot.totalSpent, 300);
    assert.equal(snapshot.totalRevenue, 800);
    assert.equal(snapshot.currentValue, 5500);
    assert.equal(snapshot.reservedCapital, 0);
  } finally {
    cleanup(dir, wallet);
  }
});

test("losing simulation is killed", () => {
  const { dir, wallet, runner } = setup();

  try {
    const result = runner.runSimulation(
      {
        id: "exp-loss",
        name: "Losing test",
        budget: 300,
        confidence: 0.8,
      },
      300,
      0
    );

    assert.equal(result.status, "EVALUATED");
    assert.equal(result.evaluation.decision, "KILL");
    assert.equal(result.evaluation.profit, -3);

    const snapshot = wallet.snapshot("test");

    assert.equal(snapshot.totalSpent, 300);
    assert.equal(snapshot.totalRevenue, 0);
    assert.equal(snapshot.currentValue, 4700);
  } finally {
    cleanup(dir, wallet);
  }
});

test("approval reserves capital before experiment starts", () => {
  const { dir, wallet, runner } = setup();

  try {
    let experiment = runner.propose({
      id: "exp-reserve",
      name: "Reserve test",
      budget: 250,
    });

    experiment = runner.approve(experiment);

    assert.equal(experiment.status, "APPROVED");
    assert.ok(experiment.reservationId);

    const snapshot = wallet.snapshot("test");

    assert.equal(snapshot.reservedCapital, 250);
  } finally {
    cleanup(dir, wallet);
  }
});

test("rejected experiment never touches wallet", () => {
  const { dir, wallet, runner } = setup();

  try {
    let experiment = runner.propose({
      id: "exp-reject",
      name: "Rejected test",
      budget: 300,
    });

    experiment = runner.reject(experiment);

    assert.equal(experiment.status, "REJECTED");

    const snapshot = wallet.snapshot("test");

    assert.equal(snapshot.reservedCapital, 0);
    assert.equal(snapshot.totalSpent, 0);
  } finally {
    cleanup(dir, wallet);
  }
});

test("cannot spend more than approved experiment budget", () => {
  const { dir, wallet, runner } = setup();

  try {
    let experiment = runner.propose({
      id: "exp-over",
      name: "Overspend test",
      budget: 200,
    });

    experiment = runner.approve(experiment);
    experiment = runner.start(experiment);

    assert.throws(() =>
      runner.complete(experiment, 201, 0)
    );

    assert.equal(wallet.snapshot("test").totalSpent, 0);
    assert.equal(wallet.snapshot("test").reservedCapital, 200);
  } finally {
    cleanup(dir, wallet);
  }
});

test("experiment lifecycle cannot skip approval", () => {
  const { dir, wallet, runner } = setup();

  try {
    const experiment = runner.propose({
      id: "exp-skip",
      name: "Lifecycle test",
      budget: 100,
    });

    assert.throws(() => runner.start(experiment));
  } finally {
    cleanup(dir, wallet);
  }
});

test("wallet policy still blocks experiment above $3", () => {
  const { dir, wallet, runner } = setup();

  try {
    assert.throws(() =>
      runner.propose({
        id: "exp-too-big",
        name: "Too large",
        budget: 301,
      })
    );
  } finally {
    cleanup(dir, wallet);
  }
});
