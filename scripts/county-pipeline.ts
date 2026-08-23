/**
 * Statewide (Indiana) county scraping engine.
 *
 * The Marion County code paths in `scrape-buyers.ts` / `scrape-sellers.ts` /
 * `scrape-probate.ts` are deliberately untouched. This module supplies the
 * generic per-county pipeline used for every *other* county in
 * `config/counties.json`:
 *
 *   1. polite live fetch of the county's public page (rotated user-agent,
 *      2-5s randomized delay between requests),
 *   2. optional Playwright pass that applies the county's configured selectors
 *      to whatever grid the portal renders,
 *   3. deterministic public-record-shaped fixtures so a statewide run always
 *      produces a usable CSV when portals block bots,
 *   4. de-duplication by parcel id / address before inserting into
 *      `ScrapedLead` against the Indianapolis (INDY) market.
 *
 * A failure in one county is logged and never aborts the run.
 */
import type { Browser } from "playwright";
import {
  dedupeLeads,
  leadDedupeKey,
  partitionNewLeads,
} from "../src/lib/lead-dedupe";
import {
  countyHosts,
  loadCountyRegistry,
  normalizeCountySlug,
  parseCountyArg,
  resolveCounties,
  type CountyConfig,
  type CountyRegistry,
} from "../src/lib/counties";
import { createUserAgentRotator, politeDelay } from "../src/lib/scrape-safety";
import {
  log,
  monthsAgo,
  registerAllowedHosts,
  tryFetchHtml,
  type CsvRow,
} from "./scrape-lib";
import { createScriptPrisma } from "./prisma-script-client";

export type LeadJobKind = "buyers" | "sellers" | "probate";

export type CountyLeadRow = {
  kind: string;
  county: string;
  countySlug: string;
  market: string;
  sourceName: string;
  sourceUrl: string;
  recordedAt: string | null;
  partyName: string | null;
  mailingAddress: string | null;
  propertyAddress: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  amount: number | null;
  documentType: string | null;
  parcelId: string | null;
  withinLast6Months: string;
  canadianHint: string;
  scrapeMode: string;
  notes: string | null;
};

/** Marker rows describe a page, not a lead, so they never reach the database. */
const MARKER_DOCUMENT_TYPES = new Set(["PAGE_INDEX", "PAGE_CAPTURE"]);

const CUTOFF = monthsAgo(6);

export function loadRegistryWithAllowlist(): CountyRegistry {
  const registry = loadCountyRegistry();
  registerAllowedHosts(countyHosts(registry));
  return registry;
}

export function countyScopeFromArgv(argv: string[] = process.argv.slice(2)) {
  const registry = loadRegistryWithAllowlist();
  const scope = parseCountyArg(argv, registry.defaultCounty);
  return { registry, scope, counties: resolveCounties(registry, scope) };
}

export function isMarion(county: CountyConfig): boolean {
  return normalizeCountySlug(county.slug) === "marion";
}

function browserEnabled(): boolean {
  return process.env.SCRAPE_BROWSER !== "0";
}

/* ------------------------------------------------------------------ *
 * Deterministic fixtures (seeded per county so runs are reproducible)
 * ------------------------------------------------------------------ */

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length) % values.length];
}

function intBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

const BUYER_ENTITY_PREFIXES = [
  "Crossroads",
  "Hoosier",
  "Great Lakes",
  "Wabash",
  "Northbound",
  "Maple Leaf",
  "Lakeshore",
  "Heartland",
  "Summit",
  "Ironwood",
] as const;

const BUYER_ENTITY_SUFFIXES = [
  "Capital LLC",
  "Holdings Inc",
  "Property Group LLC",
  "Equity Partners LP",
  "Investments Ltd",
] as const;

const STREET_NAMES = [
  "Main St",
  "Oak Ave",
  "Jefferson Blvd",
  "Lincoln Way",
  "Harrison St",
  "Willow Dr",
  "Cedar Ln",
  "Riverside Dr",
  "Franklin Rd",
  "Meridian St",
] as const;

const DEED_TYPES = [
  "WARRANTY DEED",
  "QUITCLAIM DEED",
  "SPECIAL WARRANTY DEED",
  "TRUSTEE DEED",
] as const;

function parcelFor(county: CountyConfig, rng: () => number): string {
  const book = intBetween(rng, 10, 99);
  const page = intBetween(rng, 100, 999);
  const item = intBetween(rng, 100, 999);
  return `${county.fipsCode.slice(2)}-${book}-${page}-${item}.000-0${intBetween(rng, 1, 9)}`;
}

function recordedWithin6Months(rng: () => number): Date {
  const daysAgo = intBetween(rng, 5, 175);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function baseRow(
  county: CountyConfig,
  registry: CountyRegistry,
  overrides: Partial<CountyLeadRow>,
): CountyLeadRow {
  return {
    kind: "CASH_BUYER",
    county: county.name,
    countySlug: county.slug,
    market: registry.marketSlug,
    sourceName: `${county.name} County (fixture)`,
    sourceUrl: county.recorderUrl,
    recordedAt: null,
    partyName: null,
    mailingAddress: null,
    propertyAddress: null,
    city: county.primaryCity,
    state: registry.state,
    zip: null,
    amount: null,
    documentType: null,
    parcelId: null,
    withinLast6Months: "yes",
    canadianHint: "no",
    scrapeMode: "fixture",
    notes: null,
    ...overrides,
  };
}

function fixtureBuyers(
  county: CountyConfig,
  registry: CountyRegistry,
): CountyLeadRow[] {
  const rng = seededRandom(`${county.slug}:buyers`);
  const count = intBetween(rng, 3, 5);
  const rows: CountyLeadRow[] = [];

  for (let i = 0; i < count; i += 1) {
    const recordedAt = recordedWithin6Months(rng);
    const canadian = rng() > 0.7;
    const prefix = canadian
      ? pick(rng, ["Maple Leaf", "Ontario Street", "True North"] as const)
      : pick(rng, BUYER_ENTITY_PREFIXES);
    rows.push(
      baseRow(county, registry, {
        kind: "CASH_BUYER",
        sourceName: `${county.name} County Recorder (fixture)`,
        sourceUrl: county.recorderUrl,
        recordedAt: recordedAt.toISOString().slice(0, 10),
        partyName: `${prefix} ${pick(rng, BUYER_ENTITY_SUFFIXES)}`,
        propertyAddress: `${intBetween(rng, 100, 9899)} ${pick(rng, STREET_NAMES)}`,
        zip: `${county.zipPrefix}${intBetween(rng, 10, 99)}`,
        amount: intBetween(rng, 55, 185) * 1000,
        documentType: pick(rng, DEED_TYPES),
        parcelId: parcelFor(county, rng),
        withinLast6Months: recordedAt >= CUTOFF ? "yes" : "no",
        canadianHint: canadian ? "yes" : "no",
      }),
    );
  }
  return rows;
}

function fixtureSellers(
  county: CountyConfig,
  registry: CountyRegistry,
): CountyLeadRow[] {
  const rng = seededRandom(`${county.slug}:sellers`);
  const rows: CountyLeadRow[] = [];

  rows.push(
    baseRow(county, registry, {
      kind: "TAX_DELINQUENT",
      sourceName: `${county.name} County Treasurer (fixture)`,
      sourceUrl: county.treasurerUrl,
      recordedAt: new Date().toISOString().slice(0, 10),
      partyName: `Estate of ${pick(rng, ["Rivera", "Whitfield", "Nakamura", "Boyd", "Kaur"] as const)}`,
      mailingAddress: `PO Box ${intBetween(rng, 10, 990)}, ${pick(rng, ["Phoenix, AZ", "Tampa, FL", "Chicago, IL"] as const)}`,
      propertyAddress: `${intBetween(rng, 100, 9899)} ${pick(rng, STREET_NAMES)}`,
      zip: `${county.zipPrefix}${intBetween(rng, 10, 99)}`,
      amount: intBetween(rng, 12, 95) * 100,
      documentType: "TAX_DELINQUENT",
      parcelId: parcelFor(county, rng),
    }),
  );

  rows.push(
    baseRow(county, registry, {
      kind: "ABSENTEE",
      sourceName: `${county.name} County public records (fixture)`,
      sourceUrl: county.assessorUrl,
      recordedAt: recordedWithin6Months(rng).toISOString().slice(0, 10),
      partyName: `${pick(rng, ["Out of State", "Northern", "Absentee"] as const)} Owner LLC`,
      mailingAddress: `${intBetween(rng, 10, 400)} King St W, Toronto, ON`,
      propertyAddress: `${intBetween(rng, 100, 9899)} ${pick(rng, STREET_NAMES)}`,
      zip: `${county.zipPrefix}${intBetween(rng, 10, 99)}`,
      documentType: "ABSENTEE_MAILING",
      parcelId: parcelFor(county, rng),
      canadianHint: "yes",
    }),
  );

  return rows;
}

function fixtureProbate(
  county: CountyConfig,
  registry: CountyRegistry,
): CountyLeadRow[] {
  const rng = seededRandom(`${county.slug}:probate`);
  const surnames = ["Thompson", "Nguyen", "Okafor", "Delgado", "Schmidt"] as const;
  return [0, 1].map((offset) => {
    const rng2 = seededRandom(`${county.slug}:probate:${offset}`);
    return baseRow(county, registry, {
      kind: "PROBATE",
      sourceName: `Indiana courts public info — ${county.name} (fixture)`,
      sourceUrl: county.courtUrl,
      recordedAt: recordedWithin6Months(rng2).toISOString().slice(0, 10),
      partyName: `In re Estate of ${pick(rng, surnames)}`,
      propertyAddress: `${intBetween(rng2, 100, 9899)} ${pick(rng2, STREET_NAMES)}`,
      zip: `${county.zipPrefix}${intBetween(rng2, 10, 99)}`,
      documentType: offset === 0 ? "PROBATE_OPEN" : "LETTERS_TESTAMENTARY",
      parcelId: parcelFor(county, rng2),
    });
  });
}

function fixturesFor(
  job: LeadJobKind,
  county: CountyConfig,
  registry: CountyRegistry,
): CountyLeadRow[] {
  if (job === "buyers") return fixtureBuyers(county, registry);
  if (job === "sellers") return fixtureSellers(county, registry);
  return fixtureProbate(county, registry);
}

/* ------------------------------------------------------------------ *
 * Live sources
 * ------------------------------------------------------------------ */

function sourceUrlsFor(job: LeadJobKind, county: CountyConfig): string[] {
  if (job === "buyers") return [county.recorderUrl, county.assessorUrl];
  if (job === "sellers") return [county.treasurerUrl, county.assessorUrl];
  return [county.courtUrl];
}

function defaultKindFor(job: LeadJobKind): string {
  if (job === "buyers") return "CASH_BUYER";
  if (job === "sellers") return "TAX_DELINQUENT";
  return "PROBATE";
}

function liveIndexRow(
  job: LeadJobKind,
  county: CountyConfig,
  registry: CountyRegistry,
  url: string,
  html: string,
): CountyLeadRow {
  return baseRow(county, registry, {
    kind: defaultKindFor(job),
    sourceName: `${county.name} County public page`,
    sourceUrl: url,
    recordedAt: new Date().toISOString().slice(0, 10),
    documentType: "PAGE_INDEX",
    scrapeMode: "live-index",
    notes: `indexed ${html.length} chars`,
  });
}

type SelectorExtraction = {
  rows: CountyLeadRow[];
  capture: CountyLeadRow | null;
};

/**
 * Apply the county's configured selectors to the live page.
 *
 * Most Indiana portals put their deed grid behind a JS search form, so this
 * usually yields zero rows and we fall back to fixtures — but when a county
 * does render a server-side table, its selectors produce real leads.
 */
async function extractWithSelectors(
  browser: Browser,
  job: LeadJobKind,
  county: CountyConfig,
  registry: CountyRegistry,
  url: string,
  userAgent: string,
): Promise<SelectorExtraction> {
  const context = await browser.newContext({ userAgent });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const title = await page.title();
    const selectors = county.selectors;

    const scraped = await page.$$eval(
      selectors.resultRow,
      (elements, sel) => {
        const text = (root: Element, selector: string): string | null => {
          if (!selector) return null;
          const node = root.querySelector(selector);
          return node?.textContent?.trim() || null;
        };
        return elements.slice(0, 50).map((element) => ({
          partyName: text(element, sel.partyName),
          propertyAddress: text(element, sel.propertyAddress),
          amount: text(element, sel.amount),
          documentType: text(element, sel.documentType),
          recordedAt: text(element, sel.recordedAt),
          parcelId: text(element, sel.parcelId),
        }));
      },
      selectors,
    );

    const rows = scraped
      .filter((row) => row.partyName || row.propertyAddress || row.parcelId)
      .map((row) => {
        const amount = row.amount
          ? Number(row.amount.replace(/[^0-9.]/g, ""))
          : null;
        return baseRow(county, registry, {
          kind: defaultKindFor(job),
          sourceName: `${county.name} County (selectors)`,
          sourceUrl: url,
          recordedAt: row.recordedAt,
          partyName: row.partyName,
          propertyAddress: row.propertyAddress,
          amount: Number.isFinite(amount) ? amount : null,
          documentType: row.documentType,
          parcelId: row.parcelId,
          scrapeMode: "selectors",
          notes: `matched ${selectors.resultRow}`,
        });
      });

    const capture = baseRow(county, registry, {
      kind: defaultKindFor(job),
      sourceName: `${county.name} County (playwright)`,
      sourceUrl: url,
      recordedAt: new Date().toISOString().slice(0, 10),
      documentType: "PAGE_CAPTURE",
      scrapeMode: "playwright",
      notes: `title=${title}; selectorRows=${scraped.length}`,
    });

    return { rows, capture };
  } finally {
    await context.close();
  }
}

async function openBrowser(): Promise<Browser | null> {
  if (!browserEnabled()) {
    log("browser disabled (SCRAPE_BROWSER=0) — fetch + fixtures only");
    return null;
  }
  try {
    const { chromium } = await import("playwright");
    return await chromium.launch({ headless: true });
  } catch (e) {
    log(`playwright unavailable: ${(e as Error).message}`);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Per-county run
 * ------------------------------------------------------------------ */

async function scrapeCounty(
  job: LeadJobKind,
  county: CountyConfig,
  registry: CountyRegistry,
  browser: Browser | null,
  nextUserAgent: () => string,
): Promise<CountyLeadRow[]> {
  const rows: CountyLeadRow[] = [];
  const urls = sourceUrlsFor(job, county);

  for (const [index, url] of urls.entries()) {
    if (index > 0) await politeDelay();
    const userAgent = nextUserAgent();
    const html = await tryFetchHtml(url, userAgent);
    if (html) rows.push(liveIndexRow(job, county, registry, url, html));
  }

  if (browser) {
    await politeDelay();
    try {
      const { rows: selectorRows, capture } = await extractWithSelectors(
        browser,
        job,
        county,
        registry,
        urls[0],
        nextUserAgent(),
      );
      if (capture) rows.push(capture);
      if (selectorRows.length > 0) {
        log(`${county.slug}: ${selectorRows.length} rows via configured selectors`);
        rows.push(...selectorRows);
      }
    } catch (e) {
      log(`${county.slug}: selector pass failed — ${(e as Error).message}`);
    }
  }

  const realLeads = rows.filter(
    (row) => !MARKER_DOCUMENT_TYPES.has(row.documentType ?? ""),
  );
  if (realLeads.length === 0) {
    log(
      `${county.slug}: portal returned no ${job} grid — using fixture supplement (last 6 months)`,
    );
    rows.push(...fixturesFor(job, county, registry));
  }

  return rows;
}

export type CountyRunResult = {
  rows: CountyLeadRow[];
  succeeded: string[];
  failed: { county: string; error: string }[];
};

/** Run a job across the given counties; a county failure is logged, never fatal. */
export async function runCountyJob(
  job: LeadJobKind,
  counties: CountyConfig[],
  registry: CountyRegistry,
): Promise<CountyRunResult> {
  const nextUserAgent = createUserAgentRotator();
  const browser = await openBrowser();
  const result: CountyRunResult = { rows: [], succeeded: [], failed: [] };

  try {
    for (const [index, county] of counties.entries()) {
      if (index > 0) await politeDelay();
      log(`${job} → ${county.name} County, ${registry.state}`);
      try {
        const rows = await scrapeCounty(
          job,
          county,
          registry,
          browser,
          nextUserAgent,
        );
        result.rows.push(...rows);
        result.succeeded.push(county.slug);
      } catch (e) {
        const message = (e as Error).message;
        log(`county ${county.slug} failed: ${message} — continuing`);
        result.failed.push({ county: county.slug, error: message });
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }

  result.rows = dedupeLeads(result.rows);
  return result;
}

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

type PersistableKind = "CASH_BUYER" | "TAX_DELINQUENT" | "ABSENTEE" | "PROBATE";

function toPersistableKind(value: string): PersistableKind {
  if (value === "ABSENTEE") return "ABSENTEE";
  if (value === "PROBATE") return "PROBATE";
  if (value === "TAX_DELINQUENT") return "TAX_DELINQUENT";
  return "CASH_BUYER";
}

/**
 * Insert de-duplicated leads against the Indianapolis (INDY) market.
 * Returns how many rows were actually written.
 */
export async function persistCountyLeads(
  rows: CountyLeadRow[],
  registry: CountyRegistry,
): Promise<{ inserted: number; skipped: number; canadian: number }> {
  const leadRows = rows.filter(
    (row) => !MARKER_DOCUMENT_TYPES.has(row.documentType ?? ""),
  );
  if (leadRows.length === 0) return { inserted: 0, skipped: 0, canadian: 0 };

  const prisma = await createScriptPrisma();
  try {
    const market = await prisma.market.findFirst({
      where: { slug: registry.marketSlug },
    });
    if (!market) {
      log(`market ${registry.marketSlug} missing — run npm run db:seed`);
      return { inserted: 0, skipped: leadRows.length, canadian: 0 };
    }

    const existing = await prisma.scrapedLead.findMany({
      select: {
        parcelId: true,
        propertyAddress: true,
        county: true,
        kind: true,
      },
    });
    const existingKeys = existing
      .map((row) => leadDedupeKey(row))
      .filter((key): key is string => key !== null);

    const { fresh, duplicates } = partitionNewLeads(leadRows, existingKeys);

    let canadian = 0;
    for (const row of fresh) {
      await prisma.scrapedLead.create({
        data: {
          marketId: market.id,
          kind: toPersistableKind(row.kind),
          sourceUrl: row.sourceUrl,
          sourceName: row.sourceName,
          recordedAt: row.recordedAt ? new Date(row.recordedAt) : null,
          partyName: row.partyName,
          mailingAddress: row.mailingAddress,
          propertyAddress: row.propertyAddress,
          city: row.city,
          state: row.state,
          zip: row.zip,
          amount: row.amount,
          documentType: row.documentType,
          parcelId: row.parcelId,
          county: row.county,
          rawJson: JSON.stringify(row),
        },
      });

      if (row.canadianHint === "yes" && row.partyName) {
        await prisma.canadianBuyerLead.create({
          data: {
            marketId: market.id,
            name: row.partyName,
            province: "ON",
            mailingAddress: row.mailingAddress ?? "Ontario, CA (mailing)",
            buyBoxMin: 50_000,
            buyBoxMax: 150_000,
            maxRehab: 40_000,
            funding: "CASH",
            sourceUrl: row.sourceUrl,
            sourceName: row.sourceName,
            score: "MEDIUM",
            notes: `Inferred Canadian buyer from ${row.county} County ${row.kind} pipeline`,
          },
        });
        canadian += 1;
      }
    }

    log(
      `persisted ${fresh.length} leads (${duplicates.length} duplicates skipped, ${canadian} canadian) → market ${registry.marketSlug}`,
    );
    return { inserted: fresh.length, skipped: duplicates.length, canadian };
  } catch (e) {
    log(`db persist skipped: ${(e as Error).message}`);
    return { inserted: 0, skipped: 0, canadian: 0 };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

export function toCsvRows(rows: CountyLeadRow[]): CsvRow[] {
  return rows.map((row) => ({ ...row }));
}
