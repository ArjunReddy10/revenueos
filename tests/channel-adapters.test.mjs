import test from "node:test";
import assert from "node:assert/strict";

import {
  getChannelAdapter,
  implementedChannels,
} from "../lib/channels/registry.ts";

function businessOpportunity(overrides = {}) {
  return {
    id: "biz-1",
    channel: "BUSINESS",
    title: "Website conversion audit",
    description:
      "Offer a narrow conversion audit to a local business.",
    estimatedCostCents: 200,
    estimatedRevenueCents: 5000,
    confidence: 0.7,
    risk: "low",
    evidence: [
      "Public website shows clear conversion issues.",
    ],
    ...overrides,
  };
}

test("business adapter is registered", () => {
  const adapter =
    getChannelAdapter("BUSINESS");

  assert.equal(adapter.kind, "BUSINESS");

  assert.deepEqual(
    implementedChannels(),
    ["BUSINESS"]
  );
});

test("business adapter prepares approval-gated action", () => {
  const adapter =
    getChannelAdapter("BUSINESS");

  const action = adapter.prepareAction(
    businessOpportunity()
  );

  assert.equal(action.channel, "BUSINESS");
  assert.equal(action.requiresApproval, true);
  assert.equal(action.status, "PROPOSED");
  assert.equal(action.estimatedCostCents, 200);
});

test("business execution is blocked without approval", () => {
  const adapter =
    getChannelAdapter("BUSINESS");

  const action = adapter.prepareAction(
    businessOpportunity()
  );

  const result =
    adapter.executeApprovedAction(
      action,
      false
    );

  assert.equal(result.executed, false);
  assert.equal(
    result.externalReference,
    null
  );
});

test("approved business action executes local adapter only", () => {
  const adapter =
    getChannelAdapter("BUSINESS");

  const action = adapter.prepareAction(
    businessOpportunity()
  );

  const result =
    adapter.executeApprovedAction(
      action,
      true
    );

  assert.equal(result.executed, true);
  assert.ok(result.externalReference);
  assert.ok(result.evidence.length >= 1);
});

test("unimplemented channel cannot execute", () => {
  assert.throws(() =>
    getChannelAdapter("CONTENT")
  );
});
