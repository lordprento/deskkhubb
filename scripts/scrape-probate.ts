/**
 * Probate docket leads from Indiana public court information pages.
 * County/court sources only — no Zillow/Redfin/MLS.
 *
 * Usage:
 *   npm run scrape:probate                      # Marion only (unchanged legacy path)
 *   npm run scrape:probate -- --county=all      # all counties in config/counties.json
 *
 * Output: ./output/probate-marion.csv  (Marion)
 *         ./output/indiana-probate.csv (merged, statewide runs)
 */
import path from "node:path";
import {
  assertPublicCountyUrl,
  log,
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
  "https://public.courts.in.gov/",
  "https://www.in.gov/courts/",
];

function fixtureProbate(): CsvRow[] {
  return [
    {
      kind: "PROBATE",
      market: "indianapolis",
      sourceName: "Indiana courts public info (fixture)",
      sourceUrl: SOURCE_PAGES[0],
      partyName: "In re Estate of Thompson",
      propertyAddress: "3901 N Keystone Ave",
      city: "Indianapolis",
      state: "IN",
      zip: "46205",
      documentType: "PROBATE_OPEN",
      recordedAt: new Date().toISOString().slice(0, 10),
      scrapeMode: "fixture",
    },
    {
      kind: "PROBATE",
      market: "indianapolis",
      sourceName: "Indiana courts public info (fixture)",
      sourceUrl: SOURCE_PAGES[0],
      partyName: "In re Estate of Nguyen",
      propertyAddress: "7047 E 21st St",
      city: "Indianapolis",
      state: "IN",
      zip: "46219",
      documentType: "LETTERS_TESTAMENTARY",
      recordedAt: new Date().toISOString().slice(0, 10),
      scrapeMode: "fixture",
    },
  ];
}

/** The original Marion County pipeline, unchanged. Returns rows for merging. */
async function runMarionCounty(): Promise<{ rows: CsvRow[]; inserted: number }> {
  log("scrape:probate start");
  SOURCE_PAGES.forEach((u) => assertPublicCountyUrl(u));
  const live: CsvRow[] = [];
  for (const url of SOURCE_PAGES) {
    const html = await tryFetchHtml(url);
    if (html) {
      live.push({
        kind: "PROBATE",
        market: "indianapolis",
        sourceName: "IN courts public page",
        sourceUrl: url,
        documentType: "PAGE_INDEX",
        scrapeMode: "live-index",
        notes: `fetched ${html.length} chars`,
      });
    }
  }
  const rows = [...live, ...fixtureProbate()];
  const out = writeCsv("probate-marion.csv", rows);
  log(`wrote ${rows.length} rows → ${out}`);

  try {
    const { PrismaClient } = await import("../src/generated/prisma/client");
    const { PrismaBetterSqlite3 } = await import(
      "@prisma/adapter-better-sqlite3"
    );
    const prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({
        url: `file:${path.resolve(process.cwd(), "dev.db")}`,
      }),
    });
    const market = await prisma.market.findFirst({
      where: { slug: "indianapolis" },
    });
    for (const row of fixtureProbate()) {
      await prisma.scrapedLead.create({
        data: {
          marketId: market?.id,
          kind: "PROBATE",
          sourceUrl: String(row.sourceUrl),
          sourceName: String(row.sourceName),
          partyName: String(row.partyName),
          propertyAddress: String(row.propertyAddress),
          city: "Indianapolis",
          state: "IN",
          zip: String(row.zip),
          documentType: String(row.documentType),
          recordedAt: new Date(String(row.recordedAt)),
          rawJson: JSON.stringify(row),
        },
      });
    }
    await prisma.$disconnect();
  } catch (e) {
    log(`db persist skipped: ${(e as Error).message}`);
  }
  return { rows, inserted: fixtureProbate().length };
}

async function main() {
  const { registry, scope, counties } = countyScopeFromArgv();
  const marionInScope = counties.some(isMarion);
  const otherCounties = counties.filter((county) => !isMarion(county));

  if (marionInScope && otherCounties.length === 0) {
    const marion = await runMarionCounty();
    log("scrape:probate done");
    printSummary({
      job: "probate",
      scope,
      rows: marion.rows.length,
      inserted: marion.inserted,
      countiesOk: 1,
      countiesFailed: 0,
    });
    return;
  }

  log(`scrape:probate start — county scope "${scope}" (${counties.length} counties)`);
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

  const result = await runCountyJob("probate", otherCounties, registry);
  merged.push(...toCsvRows(result.rows));

  const out = writeCsv("indiana-probate.csv", merged);
  log(`wrote ${merged.length} merged rows → ${out}`);

  const persisted = await persistCountyLeads(result.rows, registry);
  log(
    `counties ok=${result.succeeded.length} failed=${result.failed.length} inserted=${persisted.inserted} skipped=${persisted.skipped}`,
  );
  for (const failure of result.failed) {
    log(`  failed: ${failure.county} — ${failure.error}`);
  }
  log("scrape:probate done");
  printSummary({
    job: "probate",
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
