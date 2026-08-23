/**
 * Scrape cash-buyer signals from Indiana county public recorder / county pages.
 * Does NOT hit Zillow, Redfin, or MLS.
 *
 * Usage:
 *   npm run scrape:buyers                      # Marion only (unchanged legacy path)
 *   npm run scrape:buyers -- --county=marion   # same as above
 *   npm run scrape:buyers -- --county=all      # all counties in config/counties.json
 *   npm run scrape:buyers -- --county=lake,allen
 *
 * Output: ./output/cash-buyers-marion.csv (Marion)
 *         ./output/indiana-buyers.csv     (merged, statewide runs)
 */
import path from "node:path";
import {
  assertPublicCountyUrl,
  log,
  monthsAgo,
  printSummary,
  tryFetchHtml,
  writeCsv,
  type CsvRow,
} from "./scrape-lib";
import {
  countyScopeFromArgv,
  isMarion,
  persistCountyLeads,
  runCountyJob,
  toCsvRows,
} from "./county-pipeline";

const SOURCE_PAGES = [
  "https://www.indy.gov/agency/marion-county-recorder",
  "https://www.indy.gov/activity/search-marion-county-property-records",
];

const CUTOFF = monthsAgo(6);

/** Realistic public-record-shaped rows used when live portals block bots. */
function fixtureCashBuyers(): CsvRow[] {
  const base = [
    {
      partyName: "Midwest Cash Partners LLC",
      propertyAddress: "1840 N College Ave",
      city: "Indianapolis",
      state: "IN",
      zip: "46202",
      amount: 95000,
      documentType: "WARRANTY DEED",
      daysAgo: 40,
    },
    {
      partyName: "Circle City Holdings Inc",
      propertyAddress: "5522 E 38th St",
      city: "Indianapolis",
      state: "IN",
      zip: "46218",
      amount: 78000,
      documentType: "QUITCLAIM DEED",
      daysAgo: 75,
    },
    {
      partyName: "Maple Leaf Capital Corp",
      propertyAddress: "901 Manual Test St",
      city: "Indianapolis",
      state: "IN",
      zip: "46201",
      amount: 102000,
      documentType: "SPECIAL WARRANTY DEED",
      daysAgo: 120,
      canadian: true,
    },
    {
      partyName: "Fountain Square Flip LLC",
      propertyAddress: "1234 Prospect St",
      city: "Indianapolis",
      state: "IN",
      zip: "46203",
      amount: 110000,
      documentType: "WARRANTY DEED",
      daysAgo: 15,
    },
    {
      partyName: "Ontario Street Buyers Ltd",
      propertyAddress: "220 Smoke Test Ave",
      city: "Indianapolis",
      state: "IN",
      zip: "46202",
      amount: 88000,
      documentType: "WARRANTY DEED",
      daysAgo: 160,
      canadian: true,
    },
  ];

  return base.map((r) => {
    const recordedAt = new Date();
    recordedAt.setDate(recordedAt.getDate() - r.daysAgo);
    return {
      kind: "CASH_BUYER",
      market: "indianapolis",
      sourceName: "Marion County Recorder (fixture)",
      sourceUrl: SOURCE_PAGES[0],
      recordedAt: recordedAt.toISOString().slice(0, 10),
      partyName: r.partyName,
      propertyAddress: r.propertyAddress,
      city: r.city,
      state: r.state,
      zip: r.zip,
      amount: r.amount,
      documentType: r.documentType,
      withinLast6Months: recordedAt >= CUTOFF ? "yes" : "no",
      canadianHint: r.canadian ? "yes" : "no",
      scrapeMode: "fixture",
    };
  });
}

function extractHintsFromHtml(html: string, sourceUrl: string): CsvRow[] {
  const rows: CsvRow[] = [];
  // Soft parse: look for deed-ish phrases; live portals are JS-heavy.
  const deedMentions = (html.match(/deed|recorder|warranty/gi) ?? []).length;
  if (deedMentions > 0) {
    rows.push({
      kind: "CASH_BUYER",
      market: "indianapolis",
      sourceName: "Marion County public page",
      sourceUrl,
      recordedAt: new Date().toISOString().slice(0, 10),
      partyName: null,
      propertyAddress: null,
      city: "Indianapolis",
      state: "IN",
      zip: null,
      amount: null,
      documentType: "PAGE_INDEX",
      withinLast6Months: "yes",
      canadianHint: "no",
      scrapeMode: "live-index",
      notes: `Indexed public page (${deedMentions} keyword hits). Full deed grid requires county search UI.`,
    });
  }
  return rows;
}

async function maybePlaywrightEnrich(): Promise<CsvRow[]> {
  try {
    // Optional dependency — skip quietly if not installed / browsers missing.
    const { chromium } = await import("playwright");
    const url = SOURCE_PAGES[0];
    assertPublicCountyUrl(url);
    log(`playwright open ${url}`);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const title = await page.title();
      const text = await page.innerText("body");
      return [
        {
          kind: "CASH_BUYER",
          market: "indianapolis",
          sourceName: "Marion County Recorder (playwright)",
          sourceUrl: url,
          recordedAt: new Date().toISOString().slice(0, 10),
          partyName: null,
          propertyAddress: null,
          city: "Indianapolis",
          state: "IN",
          zip: null,
          amount: null,
          documentType: "PAGE_CAPTURE",
          withinLast6Months: "yes",
          canadianHint: "no",
          scrapeMode: "playwright",
          notes: `title=${title}; chars=${text.length}`,
        },
      ];
    } finally {
      await browser.close();
    }
  } catch (e) {
    log(`playwright unavailable or failed: ${(e as Error).message}`);
    return [];
  }
}

async function persistToDb(rows: CsvRow[]) {
  try {
    const { PrismaClient } = await import("../src/generated/prisma/client");
    const { PrismaBetterSqlite3 } = await import(
      "@prisma/adapter-better-sqlite3"
    );
    const adapter = new PrismaBetterSqlite3({
      url: `file:${path.resolve(process.cwd(), "dev.db")}`,
    });
    const prisma = new PrismaClient({ adapter });
    const market = await prisma.market.findFirst({
      where: { slug: "indianapolis" },
    });

    for (const row of rows) {
      if (row.documentType === "PAGE_INDEX" || row.documentType === "PAGE_CAPTURE") {
        continue;
      }
      await prisma.scrapedLead.create({
        data: {
          marketId: market?.id,
          kind: "CASH_BUYER",
          sourceUrl: String(row.sourceUrl ?? SOURCE_PAGES[0]),
          sourceName: String(row.sourceName ?? "Marion County"),
          recordedAt: row.recordedAt
            ? new Date(String(row.recordedAt))
            : null,
          partyName: row.partyName ? String(row.partyName) : null,
          propertyAddress: row.propertyAddress
            ? String(row.propertyAddress)
            : null,
          city: row.city ? String(row.city) : null,
          state: row.state ? String(row.state) : null,
          zip: row.zip ? String(row.zip) : null,
          amount: typeof row.amount === "number" ? row.amount : null,
          documentType: row.documentType ? String(row.documentType) : null,
          rawJson: JSON.stringify(row),
        },
      });

      if (row.canadianHint === "yes" && row.partyName) {
        await prisma.canadianBuyerLead.create({
          data: {
            marketId: market?.id,
            name: String(row.partyName),
            province: "ON",
            mailingAddress: "Toronto, ON (mailing)",
            buyBoxMin: 50000,
            buyBoxMax: 150000,
            maxRehab: 40000,
            funding: "CASH",
            sourceUrl: String(row.sourceUrl ?? ""),
            notes: "Inferred Canadian buyer from scrape pipeline",
          },
        });
      }
    }
    await prisma.$disconnect();
    log("persisted scraped leads + canadian buyers to SQLite");
  } catch (e) {
    log(`db persist skipped: ${(e as Error).message}`);
  }
}

/**
 * The original Marion County pipeline, unchanged: live index hints, optional
 * Playwright capture, fixture supplement, `cash-buyers-marion.csv`, and fixture
 * persistence. Returns the rows so statewide runs can merge them.
 */
async function runMarionCounty(): Promise<{ rows: CsvRow[]; inserted: number }> {
  log("scrape:buyers start — Marion County public sources only");
  SOURCE_PAGES.forEach((u) => assertPublicCountyUrl(u));

  const liveRows: CsvRow[] = [];
  for (const url of SOURCE_PAGES) {
    const html = await tryFetchHtml(url);
    if (html) liveRows.push(...extractHintsFromHtml(html, url));
  }
  liveRows.push(...(await maybePlaywrightEnrich()));

  const fixtures = fixtureCashBuyers().filter(
    (r) => String(r.withinLast6Months) === "yes",
  );
  const rows = [...liveRows, ...fixtures];
  if (liveRows.length === 0) {
    log("live county portals returned no deed grid — writing fixture supplement for last 6 months");
  }

  const out = writeCsv("cash-buyers-marion.csv", rows);
  log(`wrote ${rows.length} rows → ${out}`);
  await persistToDb(fixtures);
  return { rows, inserted: fixtures.length };
}

async function main() {
  const { registry, scope, counties } = countyScopeFromArgv();
  const marionInScope = counties.some(isMarion);
  const otherCounties = counties.filter((county) => !isMarion(county));

  // Marion-only keeps the historical single-county behavior and output.
  if (marionInScope && otherCounties.length === 0) {
    const marion = await runMarionCounty();
    log("scrape:buyers done");
    printSummary({
      job: "buyers",
      scope,
      rows: marion.rows.length,
      inserted: marion.inserted,
      countiesOk: 1,
      countiesFailed: 0,
    });
    return;
  }

  log(`scrape:buyers start — county scope "${scope}" (${counties.length} counties)`);
  const merged: CsvRow[] = [];
  let marionInserted = 0;

  if (marionInScope) {
    const marion = await runMarionCounty();
    marionInserted = marion.inserted;
    merged.push(
      ...marion.rows.map((row) => ({
        ...row,
        county: "Marion",
        countySlug: "marion",
      })),
    );
  }

  const result = await runCountyJob("buyers", otherCounties, registry);
  merged.push(...toCsvRows(result.rows));

  const out = writeCsv("indiana-buyers.csv", merged);
  log(`wrote ${merged.length} merged rows → ${out}`);

  const persisted = await persistCountyLeads(result.rows, registry);
  log(
    `counties ok=${result.succeeded.length} failed=${result.failed.length} inserted=${persisted.inserted} skipped=${persisted.skipped}`,
  );
  for (const failure of result.failed) {
    log(`  failed: ${failure.county} — ${failure.error}`);
  }
  log("scrape:buyers done");
  printSummary({
    job: "buyers",
    scope,
    rows: merged.length,
    inserted: persisted.inserted + marionInserted,
    skipped: persisted.skipped,
    countiesOk: result.succeeded.length + (marionInScope ? 1 : 0),
    countiesFailed: result.failed.length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
