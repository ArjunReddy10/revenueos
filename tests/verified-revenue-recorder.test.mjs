import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  SimulatedWallet,
} from "../lib/wallet.ts";

import {
  recordVerifiedRevenue,
} from "../lib/verified-revenue-recorder.ts";

function setup() {
  const dir = mkdtempSync(
    join(tmpdir(), "revenueos-verified-")
  );

  const wallet =
    new SimulatedWallet(
      join(dir, "wallet.sqlite")
    );

  wallet.create("test", 5000);

  const reserve = wallet.post("test", {
    type: "RESERVE",
    amount: 200,
    experimentId: "exp-real-1",
    evidence:
      "Approved test experiment",
    requestKey:
      "exp-real-1-reserve",
  });

  wallet.post("test", {
    type: "EXPERIMENT_SPEND",
    amount: 200,
    experimentId: "exp-real-1",
    referenceId: reserve.id,
    evidence:
      "Experiment cost",
    requestKey:
      "exp-real-1-spend",
  });

  return {
    dir,
    wallet,
  };
}

function cleanup(dir, wallet) {
  wallet.close();

  rmSync(dir, {
    recursive: true,
    force: true,
  });
}

test("verified external payment enters wallet", () => {
  const { dir, wallet } = setup();

  try {
    const result =
      recordVerifiedRevenue(
        wallet,
        {
          walletId: "test",
          experimentId: "exp-real-1",
          evidence: {
            source:
              "payment-provider-fixture",
            externalReference:
              "payment_001",
            amountCents: 2500,
            currency: "USD",
            receivedAt:
              "2026-09-14T19:00:00.000Z",
          },
        }
      );

    assert.equal(
      result.recorded,
      true
    );

    assert.equal(
      result.amountCents,
      2500
    );

    const snapshot =
      wallet.snapshot("test");

    assert.equal(
      snapshot.totalRevenue,
      2500
    );

    assert.equal(
      snapshot.realizedProfit,
      2300
    );

    assert.equal(
      snapshot.currentValue,
      7300
    );
  } finally {
    cleanup(dir, wallet);
  }
});

test("unverified revenue never enters wallet", () => {
  const { dir, wallet } = setup();

  try {
    const result =
      recordVerifiedRevenue(
        wallet,
        {
          walletId: "test",
          experimentId: "exp-real-1",
          evidence: null,
        }
      );

    assert.equal(
      result.recorded,
      false
    );

    const snapshot =
      wallet.snapshot("test");

    assert.equal(
      snapshot.totalRevenue,
      0
    );

    assert.equal(
      snapshot.currentValue,
      4800
    );
  } finally {
    cleanup(dir, wallet);
  }
});

test("duplicate payment reference is idempotent", () => {
  const { dir, wallet } = setup();

  try {
    const evidence = {
      source:
        "payment-provider-fixture",
      externalReference:
        "payment_same",
      amountCents: 1000,
      currency: "USD",
      receivedAt:
        "2026-09-14T19:00:00.000Z",
    };

    recordVerifiedRevenue(
      wallet,
      {
        walletId: "test",
        experimentId: "exp-real-1",
        evidence,
      }
    );

    recordVerifiedRevenue(
      wallet,
      {
        walletId: "test",
        experimentId: "exp-real-1",
        evidence,
      }
    );

    const snapshot =
      wallet.snapshot("test");

    assert.equal(
      snapshot.totalRevenue,
      1000
    );
  } finally {
    cleanup(dir, wallet);
  }
});

test("changed payload cannot reuse payment reference", () => {
  const { dir, wallet } = setup();

  try {
    recordVerifiedRevenue(
      wallet,
      {
        walletId: "test",
        experimentId: "exp-real-1",
        evidence: {
          source: "fixture",
          externalReference:
            "payment_conflict",
          amountCents: 1000,
          currency: "USD",
          receivedAt:
            "2026-09-14T19:00:00.000Z",
        },
      }
    );

    assert.throws(() =>
      recordVerifiedRevenue(
        wallet,
        {
          walletId: "test",
          experimentId: "exp-real-1",
          evidence: {
            source: "fixture",
            externalReference:
              "payment_conflict",
            amountCents: 2000,
            currency: "USD",
            receivedAt:
              "2026-09-14T19:00:00.000Z",
          },
        }
      )
    );
  } finally {
    cleanup(dir, wallet);
  }
});
