"use client";

import { useState } from "react";
import { Header } from "@/components/ui";

type Offer = {
  prospectId: string;
  businessName: string;
  score: number;
  title: string;
  priceCents: number;
  deliverables: string[];
  outreachDraft: string;
};

type Result = {
  accepted: unknown[];
  rejected: {
    reason: string;
  }[];
  offers: Offer[];
};

const dollars = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

const starter = [
  {
    id: "biz-1",
    businessName: "Example Cafe",
    website: "https://example.com",
    segment: "Local restaurant",
    source: "public website review",
    problemSignals: [
      "Ordering CTA is difficult to find",
      "Catering inquiry path is unclear",
      "Mobile conversion flow has unnecessary steps"
    ],
    estimatedValueCents: 50000,
    confidence: 0.8
  }
];

export default function ProspectsPage() {
  const [input, setInput] = useState(
    JSON.stringify(starter, null, 2)
  );

  const [result, setResult] =
    useState<Result | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  async function processBatch() {
    setLoading(true);
    setError(null);

    try {
      const prospects = JSON.parse(input);

      const response = await fetch(
        "/api/prospects",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prospects,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ?? "Unable to process prospects."
        );
      }

      setResult(json);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid input."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        eyebrow="Business agent · Local workflow"
        title="Prospect Pipeline"
      />

      <section
        className="card card-pad"
        style={{ marginBottom: 14 }}
      >
        <div className="section-head">
          <div>
            <h2>Import up to 10 businesses</h2>
            <p className="sub">
              Paste structured prospect data. RevenueOS
              scores, ranks, and prepares offers. Nothing
              is sent externally.
            </p>
          </div>
        </div>

        <textarea
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 280,
            marginTop: 12,
            borderRadius: 12,
            padding: 14,
            fontFamily: "monospace",
            background: "transparent",
            border: "1px solid var(--line)",
            color: "inherit",
          }}
        />

        <div style={{ marginTop: 12 }}>
          <button
            className="button primary"
            onClick={() => void processBatch()}
            disabled={loading}
          >
            {loading
              ? "Processing…"
              : "Process prospects"}
          </button>
        </div>

        {error && (
          <div
            className="warning"
            style={{ marginTop: 12 }}
          >
            {error}
          </div>
        )}
      </section>

      {result && (
        <>
          <section
            className="grid"
            style={{
              gridTemplateColumns:
                "repeat(3,1fr)",
              marginBottom: 14,
            }}
          >
            <div className="card card-pad">
              <div className="label">
                Accepted
              </div>
              <h2>{result.accepted.length}</h2>
            </div>

            <div className="card card-pad">
              <div className="label">
                Rejected
              </div>
              <h2>{result.rejected.length}</h2>
            </div>

            <div className="card card-pad">
              <div className="label">
                Offers generated
              </div>
              <h2>{result.offers.length}</h2>
            </div>
          </section>

          <section className="stack">
            {result.offers.map((offer) => (
              <div
                key={offer.prospectId}
                className="card card-pad"
              >
                <div className="section-head">
                  <div>
                    <div className="eyebrow">
                      Score {offer.score}/100
                    </div>
                    <h2 style={{ marginTop: 5 }}>
                      {offer.businessName}
                    </h2>
                  </div>

                  <div className="positive">
                    {dollars(
                      offer.priceCents
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="label">
                    Proposed offer
                  </div>
                  <b>{offer.title}</b>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="label">
                    Deliverables
                  </div>

                  <ul>
                    {offer.deliverables.map(
                      (item) => (
                        <li key={item}>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="label">
                    Outreach draft
                  </div>

                  <p className="sub">
                    {offer.outreachDraft}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <button className="button primary">
                    Approve draft
                  </button>

                  <button className="button">
                    Reject
                  </button>
                </div>

                <p
                  className="sub"
                  style={{
                    fontSize: 12,
                    marginTop: 10,
                  }}
                >
                  Approval does not send anything yet.
                  External sending will be a separate
                  connector step.
                </p>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}
