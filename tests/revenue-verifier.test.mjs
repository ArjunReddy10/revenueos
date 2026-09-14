import test from "node:test";
import assert from "node:assert/strict";

import {
  verifyRevenue,
} from "../lib/revenue-verifier.ts";

test("missing payment evidence is not revenue", () => {
  const result = verifyRevenue(null);

  assert.equal(result.verified, false);
  assert.equal(result.amountCents, 0);
});

test("valid external payment evidence verifies revenue", () => {
  const result = verifyRevenue({
    source: "payment-provider-fixture",
    externalReference: "pay_123",
    amountCents: 2500,
    currency: "USD",
    receivedAt:
      "2026-09-14T18:00:00.000Z",
  });

  assert.equal(result.verified, true);
  assert.equal(result.amountCents, 2500);
});

test("zero or negative revenue cannot verify", () => {
  const result = verifyRevenue({
    source: "fixture",
    externalReference: "pay_bad",
    amountCents: 0,
    currency: "USD",
    receivedAt:
      "2026-09-14T18:00:00.000Z",
  });

  assert.equal(result.verified, false);
});

test("missing external reference cannot verify", () => {
  const result = verifyRevenue({
    source: "fixture",
    externalReference: "",
    amountCents: 1000,
    currency: "USD",
    receivedAt:
      "2026-09-14T18:00:00.000Z",
  });

  assert.equal(result.verified, false);
});

test("invalid timestamp cannot verify", () => {
  const result = verifyRevenue({
    source: "fixture",
    externalReference: "pay_456",
    amountCents: 1000,
    currency: "USD",
    receivedAt: "not-a-date",
  });

  assert.equal(result.verified, false);
});
