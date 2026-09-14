import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeProspect,
  processProspects,
  selectTopOffers,
} from "../lib/prospect-pipeline.ts";

function row(overrides = {}) {
  return {
    id: "biz-1",
    businessName: "Example Cafe",
    website: "https://example.com",
    segment: "Local restaurant",
    source: "public website review",
    problemSignals: [
      "Ordering button is difficult to find",
      "Catering inquiry path is unclear",
      "Mobile conversion flow has unnecessary steps",
    ],
    estimatedValueCents: 50000,
    confidence: 0.8,
    ...overrides,
  };
}

test("prospect row normalizes successfully", () => {
  const result =
    normalizeProspect(row());

  assert.equal(
    result.businessName,
    "Example Cafe"
  );

  assert.equal(
    result.problemSignals.length,
    3
  );
});

test("pipe separated problem signals normalize", () => {
  const result =
    normalizeProspect(
      row({
        problemSignals:
          "Issue one | Issue two | Issue three",
      })
    );

  assert.equal(
    result.problemSignals.length,
    3
  );
});

test("invalid prospect is rejected", () => {
  const result =
    processProspects([
      row(),
      row({
        id: "bad",
        businessName: "",
      }),
    ]);

  assert.equal(
    result.accepted.length,
    1
  );

  assert.equal(
    result.rejected.length,
    1
  );
});

test("strong prospects generate offers", () => {
  const result =
    processProspects([
      row({
        id: "strong",
        confidence: 0.9,
        estimatedValueCents: 80000,
      }),
    ]);

  assert.equal(
    result.offers.length,
    1
  );

  assert.equal(
    result.offers[0].prospectId,
    "strong"
  );

  assert.equal(
    result.offers[0]
      .requiresHumanApproval,
    true
  );
});

test("weak prospects do not generate offer", () => {
  const result =
    processProspects([
      row({
        id: "weak",
        problemSignals: [
          "Minor typo",
        ],
        confidence: 0.1,
        estimatedValueCents: 1000,
      }),
    ]);

  assert.equal(
    result.accepted.length,
    1
  );

  assert.equal(
    result.offers.length,
    0
  );
});

test("stronger prospects rank first", () => {
  const result =
    processProspects([
      row({
        id: "weak",
        confidence: 0.4,
        estimatedValueCents: 10000,
        problemSignals: [
          "One meaningful issue",
        ],
      }),
      row({
        id: "strong",
        confidence: 0.95,
        estimatedValueCents: 90000,
      }),
    ]);

  assert.equal(
    result.accepted[0].id,
    "strong"
  );
});

test("top offer limit is respected", () => {
  const offers =
    selectTopOffers(
      [
        row({
          id: "a",
          confidence: 0.9,
        }),
        row({
          id: "b",
          confidence: 0.85,
        }),
        row({
          id: "c",
          confidence: 0.8,
        }),
      ],
      2
    );

  assert.equal(
    offers.length,
    2
  );
});
