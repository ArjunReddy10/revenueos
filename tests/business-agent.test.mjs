import test from "node:test";
import assert from "node:assert/strict";

import {
  scoreBusinessProspect,
  buildBusinessOffer,
  rankBusinessProspects,
  selectBestBusinessProspect,
} from "../lib/business-agent.ts";

function prospect(overrides = {}) {
  return {
    id: "prospect-1",
    businessName: "Example Restaurant",
    website: "https://example.com",
    segment: "Local restaurant",
    source: "public website review",
    problemSignals: [
      "Online ordering call-to-action is difficult to find",
      "Mobile booking path requires too many steps",
      "No clear lead capture for catering inquiries",
    ],
    estimatedValueCents: 50000,
    confidence: 0.8,
    ...overrides,
  };
}

test("business prospect gets deterministic score", () => {
  const score =
    scoreBusinessProspect(
      prospect()
    );

  assert.ok(score >= 45);
  assert.ok(score <= 100);
});

test("business offer is created from qualified prospect", () => {
  const offer =
    buildBusinessOffer(
      prospect()
    );

  assert.equal(
    offer.businessName,
    "Example Restaurant"
  );

  assert.equal(
    offer.requiresHumanApproval,
    true
  );

  assert.equal(
    offer.opportunity.channel,
    "BUSINESS"
  );

  assert.equal(
    offer.action.status,
    "PROPOSED"
  );

  assert.ok(
    offer.outreachDraft.includes(
      "Example Restaurant"
    )
  );
});

test("offer price stays within guardrails", () => {
  const offer =
    buildBusinessOffer(
      prospect({
        estimatedValueCents:
          1_000_000,
      })
    );

  assert.equal(
    offer.priceCents,
    15000
  );
});

test("weak prospect is rejected", () => {
  assert.throws(() =>
    buildBusinessOffer(
      prospect({
        problemSignals: [
          "Minor typo",
        ],
        estimatedValueCents: 1000,
        confidence: 0.2,
      })
    )
  );
});

test("prospects are ranked strongest first", () => {
  const ranked =
    rankBusinessProspects([
      prospect({
        id: "weak",
        problemSignals: [
          "One issue",
        ],
        confidence: 0.4,
        estimatedValueCents: 10000,
      }),
      prospect({
        id: "strong",
        confidence: 0.9,
        estimatedValueCents: 70000,
      }),
    ]);

  assert.equal(
    ranked[0].id,
    "strong"
  );
});

test("best prospect is selected", () => {
  const best =
    selectBestBusinessProspect([
      prospect({
        id: "a",
        confidence: 0.5,
      }),
      prospect({
        id: "b",
        confidence: 0.9,
      }),
    ]);

  assert.equal(
    best.id,
    "b"
  );
});
