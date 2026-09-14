import { NextRequest, NextResponse } from "next/server";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { SimulatedWallet } from "@/lib/wallet";
import { RevenueOrchestrator } from "@/lib/orchestrator";
import {
  selectBestOpportunity,
  type RawOpportunitySignal,
} from "@/lib/opportunity-scout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function allowed(request: NextRequest, write = false) {
  if (process.env.REVENUEOS_LOCAL_SIMULATION !== "true") {
    return false;
  }

  const host = request.headers.get("host") ?? "";

  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
    return false;
  }

  if (
    write &&
    request.headers.get("origin") !== `http://${host}`
  ) {
    return false;
  }

  return true;
}

function openWallet() {
  const dir = join(process.cwd(), ".local");

  mkdirSync(dir, {
    recursive: true,
  });

  const wallet = new SimulatedWallet(
    join(dir, "simulation.sqlite")
  );

  wallet.create("local");

  return wallet;
}

function demoSignals(): RawOpportunitySignal[] {
  return [
    {
      id: "local-report",
      title: "Niche research report",
      description:
        "Test whether a focused digital research report can produce positive simulated unit economics.",
      category: "digital product",
      segment: "Small business",
      estimatedCostCents: 200,
      estimatedRevenueCents: 800,
      estimatedTimeHours: 2,
      confidence: 0.82,
      risk: "low",
      evidence: [
        {
          source: "local-simulation-fixture",
          note: "Seeded demand evidence for local Revenue OS testing.",
        },
      ],
    },
    {
      id: "local-audit",
      title: "Micro website revenue audit",
      description:
        "Test a small simulated paid audit focused on identifying conversion leaks.",
      category: "service",
      segment: "Local business",
      estimatedCostCents: 150,
      estimatedRevenueCents: 500,
      estimatedTimeHours: 3,
      confidence: 0.68,
      risk: "low",
      evidence: [
        {
          source: "local-simulation-fixture",
          note: "Seeded service demand evidence for local testing.",
        },
      ],
    },
    {
      id: "local-content",
      title: "Focused content package",
      description:
        "Test simulated willingness to pay for a narrow business content package.",
      category: "digital service",
      segment: "Creator business",
      estimatedCostCents: 250,
      estimatedRevenueCents: 550,
      estimatedTimeHours: 4,
      confidence: 0.58,
      risk: "medium",
      evidence: [
        {
          source: "local-simulation-fixture",
          note: "Seeded content demand evidence for local testing.",
        },
      ],
    },
  ];
}

export async function GET(request: NextRequest) {
  if (!allowed(request)) {
    return NextResponse.json(
      {
        error:
          "Revenue cycle is available only in the local simulation server.",
      },
      {
        status: 403,
      }
    );
  }

  const wallet = openWallet();

  try {
    const signals = demoSignals();
    const opportunity = selectBestOpportunity(signals);

    return NextResponse.json(
      {
        simulation: true,
        opportunity,
        snapshot: wallet.snapshot("local"),
        ledger: wallet.ledger("local"),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } finally {
    wallet.close();
  }
}

export async function POST(request: NextRequest) {
  if (!allowed(request, true)) {
    return NextResponse.json(
      {
        error:
          "Local same-origin simulation access required.",
      },
      {
        status: 403,
      }
    );
  }

  const wallet = openWallet();

  try {
    const body = await request.json();

    if (
      body?.outcome !== "profit" &&
      body?.outcome !== "loss"
    ) {
      return NextResponse.json(
        {
          error:
            'Outcome must be either "profit" or "loss".',
        },
        {
          status: 400,
        }
      );
    }

    const orchestrator = new RevenueOrchestrator(
      wallet,
      "local"
    );

    const result = orchestrator.runCycle({
      signals: demoSignals(),
      approved: true,
      outcome:
        body.outcome === "profit"
          ? {
              actualSpendCents: 200,
              revenueCents: 800,
            }
          : {
              actualSpendCents: 200,
              revenueCents: 0,
            },
    });

    return NextResponse.json(
      {
        simulation: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to run Revenue OS cycle.",
      },
      {
        status: 400,
      }
    );
  } finally {
    wallet.close();
  }
}
