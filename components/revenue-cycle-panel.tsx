"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Play,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type Snapshot = {
  currentValue: number;
  totalSpent: number;
  totalRevenue: number;
  realizedProfit: number;
  reservedCapital: number;
};

type Opportunity = {
  id: string;
  title: string;
  description: string;
  category: string;
  segment: string;
  estimatedCostCents: number;
  estimatedRevenueCents: number;
  confidence: number;
  risk: string;
  expectedProfitCents: number;
  score: number;
  recommendedExperiment: {
    name: string;
    budgetCents: number;
    successMetric: string;
  };
};

type Evaluation = {
  decision: string;
  state: string;
  profit: number;
  roi: number;
};

type Experiment = {
  id: string;
  name: string;
  status: string;
  budget: number;
  actualSpend: number;
  revenue: number;
  evaluation: Evaluation | null;
};

type CycleResponse = {
  simulation: boolean;
  opportunity: Opportunity | null;
  experiment?: Experiment | null;
  snapshot?: Snapshot;
  wallet?: Snapshot;
  error?: string;
};

const dollars = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

export function RevenueCyclePanel() {
  const [data, setData] =
    useState<CycleResponse | null>(null);

  const [running, setRunning] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/cycle", {
        cache: "no-store",
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ?? "Unable to load cycle."
        );
      }

      setData(json);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load cycle."
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(
    outcome: "profit" | "loss"
  ) {
    setRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/cycle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outcome,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ??
            "Unable to run simulation."
        );
      }

      setData(json);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to run simulation."
      );
    } finally {
      setRunning(false);
    }
  }

  const opportunity = data?.opportunity ?? null;

  const snapshot =
    data?.wallet ?? data?.snapshot ?? null;

  const experiment = data?.experiment ?? null;

  return (
    <section
      className="card card-pad"
      style={{
        marginTop: 14,
      }}
    >
      <div className="section-head">
        <div>
          <div className="eyebrow">
            Live local engine
          </div>

          <h2 style={{ marginTop: 5 }}>
            Revenue cycle
          </h2>

          <p
            className="sub"
            style={{ marginTop: 5 }}
          >
            Real Revenue OS backend logic with
            simulated money and outcomes.
          </p>
        </div>

        <button
          className="button"
          onClick={() => void load()}
          disabled={running}
        >
          <RefreshCw
            size={14}
            style={{
              verticalAlign: "middle",
              marginRight: 5,
            }}
          />
          Refresh
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

      {!opportunity && !error && (
        <div
          className="sub"
          style={{ marginTop: 14 }}
        >
          Loading Revenue OS engine…
        </div>
      )}

      {opportunity && (
        <>
          <div
            className="grid"
            style={{
              gridTemplateColumns:
                "1.3fr .7fr",
              marginTop: 14,
            }}
          >
            <div
              style={{
                border:
                  "1px solid var(--line)",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div className="label">
                Selected opportunity
              </div>

              <h3
                style={{
                  marginTop: 6,
                  marginBottom: 7,
                }}
              >
                {opportunity.title}
              </h3>

              <p className="sub">
                {opportunity.description}
              </p>

              <div
                className="grid"
                style={{
                  gridTemplateColumns:
                    "repeat(4,1fr)",
                  marginTop: 15,
                }}
              >
                <div>
                  <div className="label">
                    Scout score
                  </div>
                  <b>{opportunity.score}/100</b>
                </div>

                <div>
                  <div className="label">
                    Confidence
                  </div>
                  <b>
                    {Math.round(
                      opportunity.confidence *
                        100
                    )}
                    %
                  </b>
                </div>

                <div>
                  <div className="label">
                    Test budget
                  </div>
                  <b>
                    {dollars(
                      opportunity
                        .recommendedExperiment
                        .budgetCents
                    )}
                  </b>
                </div>

                <div>
                  <div className="label">
                    Expected profit
                  </div>
                  <b className="positive">
                    {dollars(
                      opportunity.expectedProfitCents
                    )}
                  </b>
                </div>
              </div>
            </div>

            <div
              style={{
                border:
                  "1px solid var(--line)",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div className="label">
                Persistent simulation wallet
              </div>

              <div
                style={{
                  fontSize: 30,
                  fontWeight: 750,
                  marginTop: 7,
                }}
              >
                {snapshot
                  ? dollars(
                      snapshot.currentValue
                    )
                  : "—"}
              </div>

              <div
                className="sub"
                style={{ marginTop: 5 }}
              >
                Revenue{" "}
                {snapshot
                  ? dollars(
                      snapshot.totalRevenue
                    )
                  : "—"}{" "}
                · Spend{" "}
                {snapshot
                  ? dollars(
                      snapshot.totalSpent
                    )
                  : "—"}
              </div>

              {snapshot && (
                <div
                  className={
                    snapshot.realizedProfit >= 0
                      ? "positive"
                      : "warning"
                  }
                  style={{ marginTop: 9 }}
                >
                  Realized P/L{" "}
                  {dollars(
                    snapshot.realizedProfit
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 9,
              flexWrap: "wrap",
              marginTop: 14,
            }}
          >
            <button
              className="button primary"
              disabled={running}
              onClick={() =>
                void run("profit")
              }
            >
              <Play
                size={14}
                style={{
                  verticalAlign: "middle",
                  marginRight: 5,
                }}
              />
              {running
                ? "Running…"
                : "Approve profitable simulation"}
            </button>

            <button
              className="button"
              disabled={running}
              onClick={() =>
                void run("loss")
              }
            >
              <TrendingDown
                size={14}
                style={{
                  verticalAlign: "middle",
                  marginRight: 5,
                }}
              />
              Test loss path
            </button>
          </div>

          {experiment?.evaluation && (
            <div
              style={{
                marginTop: 14,
                border:
                  "1px solid var(--line)",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div className="section-head">
                <div>
                  <div className="label">
                    Survival decision
                  </div>

                  <h3
                    style={{ marginTop: 5 }}
                  >
                    {
                      experiment.evaluation
                        .decision
                    }
                  </h3>
                </div>

                {experiment.evaluation
                  .decision === "SCALE" ? (
                  <TrendingUp
                    size={24}
                    className="positive"
                  />
                ) : experiment.evaluation
                    .decision === "KILL" ? (
                  <Activity
                    size={24}
                    className="warning"
                  />
                ) : (
                  <CheckCircle2 size={24} />
                )}
              </div>

              <div
                className="grid"
                style={{
                  gridTemplateColumns:
                    "repeat(4,1fr)",
                  marginTop: 12,
                }}
              >
                <div>
                  <div className="label">
                    Experiment
                  </div>
                  <b>{experiment.name}</b>
                </div>

                <div>
                  <div className="label">
                    Actual spend
                  </div>
                  <b>
                    {dollars(
                      experiment.actualSpend
                    )}
                  </b>
                </div>

                <div>
                  <div className="label">
                    Revenue
                  </div>
                  <b>
                    {dollars(
                      experiment.revenue
                    )}
                  </b>
                </div>

                <div>
                  <div className="label">
                    Profit
                  </div>
                  <b
                    className={
                      experiment.evaluation
                        .profit >= 0
                        ? "positive"
                        : "warning"
                    }
                  >
                    {new Intl.NumberFormat(
                      "en-US",
                      {
                        style: "currency",
                        currency: "USD",
                      }
                    ).format(
                      experiment.evaluation
                        .profit
                    )}
                  </b>
                </div>
              </div>
            </div>
          )}

          <p
            className="sub"
            style={{
              marginTop: 12,
              fontSize: 12,
            }}
          >
            Simulation only. No external service,
            payment processor, trading account, ad
            account, or real-money execution is
            connected.
          </p>
        </>
      )}
    </section>
  );
}
