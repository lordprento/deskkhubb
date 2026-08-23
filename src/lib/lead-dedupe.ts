/**
 * Lead de-duplication by parcel id (preferred) or normalized property address.
 * Pure functions — used by the scrapers before they touch the database.
 */

const STREET_SUFFIXES: Record<string, string> = {
  street: "st",
  avenue: "ave",
  av: "ave",
  road: "rd",
  drive: "dr",
  boulevard: "blvd",
  lane: "ln",
  court: "ct",
  place: "pl",
  terrace: "ter",
  parkway: "pkwy",
  circle: "cir",
  trail: "trl",
  highway: "hwy",
  north: "n",
  south: "s",
  east: "e",
  west: "w",
  northeast: "ne",
  northwest: "nw",
  southeast: "se",
  southwest: "sw",
};

export function normalizeAddress(value: string | null | undefined): string {
  if (!value) return "";
  const words = value
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => STREET_SUFFIXES[word] ?? word);
  return words.join(" ").trim();
}

export function normalizeParcelId(value: string | null | undefined): string {
  if (!value) return "";
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type DedupeCandidate = {
  parcelId?: string | null;
  propertyAddress?: string | null;
  county?: string | null;
  kind?: string | null;
};

/**
 * Stable identity for a lead. Parcel id wins when present because counties
 * spell addresses inconsistently. Returns null when neither is usable, so
 * callers can decide to keep such rows rather than collapsing them together.
 */
export function leadDedupeKey(candidate: DedupeCandidate): string | null {
  const parcel = normalizeParcelId(candidate.parcelId);
  if (parcel) return `parcel:${parcel}`;

  const address = normalizeAddress(candidate.propertyAddress);
  if (address) {
    const county = (candidate.county ?? "").toLowerCase().trim();
    const kind = (candidate.kind ?? "").toLowerCase().trim();
    return `addr:${kind}:${county}:${address}`;
  }
  return null;
}

/** Keep the first occurrence of each dedupe key; rows without a key pass through. */
export function dedupeLeads<T extends DedupeCandidate>(rows: T[]): T[] {
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const row of rows) {
    const key = leadDedupeKey(row);
    if (key === null) {
      kept.push(row);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(row);
  }
  return kept;
}

/** Split rows into those already present (by key) and those safe to insert. */
export function partitionNewLeads<T extends DedupeCandidate>(
  rows: T[],
  existingKeys: Iterable<string>,
): { fresh: T[]; duplicates: T[] } {
  const known = new Set(existingKeys);
  const fresh: T[] = [];
  const duplicates: T[] = [];
  for (const row of dedupeLeads(rows)) {
    const key = leadDedupeKey(row);
    if (key !== null && known.has(key)) {
      duplicates.push(row);
      continue;
    }
    if (key !== null) known.add(key);
    fresh.push(row);
  }
  return { fresh, duplicates };
}
