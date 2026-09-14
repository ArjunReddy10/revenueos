import {
  buildBusinessOffer,
  scoreBusinessProspect,
  type BusinessOffer,
  type BusinessProspect,
} from "./business-agent.ts";

export interface ProspectImportRow {
  id?: string;
  businessName?: string;
  website?: string;
  segment?: string;
  source?: string;
  problemSignals?: string[] | string;
  estimatedValueCents?: number | string;
  confidence?: number | string;
}

export interface ProspectPipelineResult {
  accepted: BusinessProspect[];
  rejected: {
    row: ProspectImportRow;
    reason: string;
  }[];
  offers: BusinessOffer[];
}

function requiredString(
  value: unknown,
  field: string
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

function normalizeSignals(
  value: string[] | string | undefined
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseInteger(
  value: number | string | undefined,
  field: string
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 0
  ) {
    throw new Error(
      `${field} must be a non-negative integer`
    );
  }

  return parsed;
}

function parseConfidence(
  value: number | string | undefined
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 1
  ) {
    throw new Error(
      "Confidence must be between 0 and 1"
    );
  }

  return parsed;
}

export function normalizeProspect(
  row: ProspectImportRow
): BusinessProspect {
  const problemSignals =
    normalizeSignals(row.problemSignals);

  if (!problemSignals.length) {
    throw new Error(
      "At least one problem signal is required"
    );
  }

  return {
    id: requiredString(
      row.id,
      "Prospect ID"
    ),
    businessName: requiredString(
      row.businessName,
      "Business name"
    ),
    website: requiredString(
      row.website,
      "Website"
    ),
    segment: requiredString(
      row.segment,
      "Segment"
    ),
    source: requiredString(
      row.source,
      "Source"
    ),
    problemSignals,
    estimatedValueCents: parseInteger(
      row.estimatedValueCents,
      "Estimated value"
    ),
    confidence: parseConfidence(
      row.confidence
    ),
  };
}

export function processProspects(
  rows: ProspectImportRow[]
): ProspectPipelineResult {
  const accepted: BusinessProspect[] = [];
  const rejected: {
    row: ProspectImportRow;
    reason: string;
  }[] = [];

  for (const row of rows) {
    try {
      const prospect =
        normalizeProspect(row);

      scoreBusinessProspect(prospect);

      accepted.push(prospect);
    } catch (error) {
      rejected.push({
        row,
        reason:
          error instanceof Error
            ? error.message
            : "Invalid prospect",
      });
    }
  }

  const ranked = [...accepted].sort(
    (a, b) =>
      scoreBusinessProspect(b) -
      scoreBusinessProspect(a)
  );

  const offers: BusinessOffer[] = [];

  for (const prospect of ranked) {
    try {
      offers.push(
        buildBusinessOffer(prospect)
      );
    } catch {
      // Valid prospect but not strong enough
      // for an offer yet.
    }
  }

  return {
    accepted: ranked,
    rejected,
    offers,
  };
}

export function selectTopOffers(
  rows: ProspectImportRow[],
  limit = 10
): BusinessOffer[] {
  if (
    !Number.isSafeInteger(limit) ||
    limit <= 0
  ) {
    throw new Error(
      "Offer limit must be a positive integer"
    );
  }

  return processProspects(rows)
    .offers
    .slice(0, limit);
}
