import { NextRequest, NextResponse } from "next/server";
import {
  processProspects,
  type ProspectImportRow,
} from "@/lib/prospect-pipeline";

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

export async function POST(request: NextRequest) {
  if (!allowed(request, true)) {
    return NextResponse.json(
      { error: "Local same-origin access required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    if (!Array.isArray(body?.prospects)) {
      return NextResponse.json(
        { error: "prospects must be an array" },
        { status: 400 }
      );
    }

    if (body.prospects.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 prospects per local batch." },
        { status: 400 }
      );
    }

    const result = processProspects(
      body.prospects as ProspectImportRow[]
    );

    return NextResponse.json({
      simulation: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process prospects.",
      },
      { status: 400 }
    );
  }
}
