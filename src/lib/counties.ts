/**
 * Indiana county registry loaded from `config/counties.json`.
 *
 * Server/script only — reads from disk. Never import into a client component.
 */
import fs from "node:fs";
import path from "node:path";

export type CountySelectors = {
  resultRow: string;
  partyName: string;
  propertyAddress: string;
  amount: string;
  documentType: string;
  recordedAt: string;
  parcelId: string;
  nextPage?: string;
};

export type CountyConfig = {
  name: string;
  slug: string;
  fipsCode: string;
  primaryCity: string;
  zipPrefix: string;
  recorderUrl: string;
  assessorUrl: string;
  treasurerUrl: string;
  courtUrl: string;
  selectors: CountySelectors;
};

export type CountyRegistry = {
  state: string;
  marketSlug: string;
  defaultCounty: string;
  counties: CountyConfig[];
};

export const COUNTY_CONFIG_RELATIVE_PATH = path.join("config", "counties.json");

/** "St. Joseph" / "ST_JOSEPH" / "st joseph" all collapse to "st-joseph". */
export function normalizeCountySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function loadCountyRegistry(cwd: string = process.cwd()): CountyRegistry {
  const file = path.resolve(cwd, COUNTY_CONFIG_RELATIVE_PATH);
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw) as CountyRegistry;
  if (!Array.isArray(parsed.counties) || parsed.counties.length === 0) {
    throw new Error(`No counties configured in ${COUNTY_CONFIG_RELATIVE_PATH}`);
  }
  return parsed;
}

/** Every hostname referenced by the registry, for the scraper allowlist. */
export function countyHosts(registry: CountyRegistry): string[] {
  const hosts = new Set<string>();
  for (const county of registry.counties) {
    for (const url of [
      county.recorderUrl,
      county.assessorUrl,
      county.treasurerUrl,
      county.courtUrl,
    ]) {
      try {
        hosts.add(new URL(url).hostname.toLowerCase());
      } catch {
        // A malformed URL simply contributes no host; assertPublicCountyUrl
        // will reject it later with a clearer message.
      }
    }
  }
  return Array.from(hosts).sort();
}

/**
 * Read `--county=<scope>` (or `--county <scope>`) from argv.
 * Falls back to the registry default so bare `npm run scrape:buyers`
 * keeps its historical Marion-only behavior.
 */
export function parseCountyArg(
  argv: string[],
  fallback = "marion",
): string {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--county=")) {
      const value = arg.slice("--county=".length).trim();
      if (value) return value;
    }
    if (arg === "--county" && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      return argv[i + 1].trim();
    }
  }
  return fallback;
}

/**
 * Resolve a scope string to county configs.
 * "all" → every county; otherwise a comma-separated list of slugs/names.
 */
export function resolveCounties(
  registry: CountyRegistry,
  scope: string,
): CountyConfig[] {
  const normalizedScope = normalizeCountySlug(scope);
  if (normalizedScope === "all" || normalizedScope === "indiana") {
    return registry.counties;
  }

  const wanted = scope
    .split(",")
    .map((part) => normalizeCountySlug(part))
    .filter(Boolean);

  const bySlug = new Map(
    registry.counties.map((county) => [normalizeCountySlug(county.slug), county]),
  );
  const byName = new Map(
    registry.counties.map((county) => [normalizeCountySlug(county.name), county]),
  );

  const resolved: CountyConfig[] = [];
  for (const key of wanted) {
    const county = bySlug.get(key) ?? byName.get(key);
    if (!county) {
      const known = registry.counties.map((c) => c.slug).join(", ");
      throw new Error(`Unknown county "${key}". Known counties: ${known}, all`);
    }
    if (!resolved.includes(county)) resolved.push(county);
  }

  if (resolved.length === 0) {
    throw new Error(`Could not resolve any county from scope "${scope}"`);
  }
  return resolved;
}

export function isMarionOnly(counties: CountyConfig[]): boolean {
  return counties.length === 1 && normalizeCountySlug(counties[0].slug) === "marion";
}
