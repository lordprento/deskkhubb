/**
 * Tax-delinquent / absentee owner leads from Indiana county public pages.
 * County sources only — no Zillow/Redfin/MLS.
 *
 * Usage:
 *   npm run scrape:sellers                      # Marion only (unchanged legacy path)
 *   npm run scrape:sellers -- --county=all      # all counties in config/counties.json
 *
 * Output: ./output/sellers-marion.csv  (Marion)
 *         ./output/indiana-sellers.csv (merged, statewide runs)
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
  "https://www.indy.gov/agency/marion-county-treasurer",
  "https://www.indy.gov/activity/pay-property-taxes",
];

function fixtureSellers(): CsvRow[] {
  const cutoff = monthsAgo(6);
  return [
    {
      kind: "TAX_DELINQUENT",
      market: "indianapolis",
      sourceName: "Marion County Treasurer (fixture)",
      sourceUrl: SOURCE_PAGES[0],
      partyName: "Estate of Rivera",
      mailingAddress: "PO Box 12, Phoenix, AZ 85001",
      propertyAddress: "4102 E Washington St",
      city: "Indianapolis",
      state: "IN",
      zip: "46201",
      amount: 4800,
      documentType: "TAX_DELINQUENT",
      recordedAt: new Date().toISOString().slice(0, 10),
      scrapeMode: "fixture",
    },
    {
      kind: "ABSENTEE",
      market: "indianapolis",
      sourceName: "Marion County public records (fixture)",
      sourceUrl: SOURCE_PAGES[0],
      partyName: "Out of State Owner LLC",
      mailingAddress: "88 King St W, Toronto, ON",
      propertyAddress: "2715 N Sherman Dr",
      city: "Indianapolis",
      state: "IN",
      zip: "46218",
      amount: null,
      documentType: "ABSENTEE_MAILING",
      recordedAt: cutoff.toISOString().slice(0, 10),
      scrapeMode: "fixture",
    },
  ];
}

/** The original Marion County pipeline, unchanged. Returns rows for merging. */
async function runMarionCounty(): Promise<{ rows: CsvRow[]; inserted: number }> {
  log("scrape:sellers start");
  SOURCE_PAGES.forEach((u) => assertPublicCountyUrl(u));
  const live: CsvRow[] = [];
  for (const url of SOURCE_PAGES) {
    const html = await tryFetchHtml(url);
    if (html) {
      live.push({
        kind: "TAX_DELINQUENT",
        market: "indianapolis",
        sourceName: "Marion County Treasurer page",
        sourceUrl: url,
        documentType: "PAGE_INDEX",
        scrapeMode: "live-index",
        notes: `fetched ${html.length} chars`,
      });
    }
  }
  const rows = [...live, ...fixtureSellers()];
  const out = writeCsv("sellers-marion.csv", rows);
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
    for (const row of fixtureSellers()) {
      await prisma.scrapedLead.create({
        data: {
          marketId: market?.id,
          kind: row.kind === "ABSENTEE" ? "ABSENTEE" : "TAX_DELINQUENT",
          sourceUrl: String(row.sourceUrl),
          sourceName: String(row.sourceName),
          partyName: row.partyName ? String(row.partyName) : null,
          mailingAddress: row.mailingAddress
            ? String(row.mailingAddress)
            : null,
          propertyAddress: row.propertyAddress
            ? String(row.propertyAddress)
            : null,
          city: "Indianapolis",
          state: "IN",
          zip: row.zip ? String(row.zip) : null,
          amount: typeof row.amount === "number" ? row.amount : null,
          documentType: String(row.documentType),
          rawJson: JSON.stringify(row),
        },
      });
    }
    await prisma.$disconnect();
  } catch (e) {
    log(`db persist skipped: ${(e as Error).message}`);
  }
  return { rows, inserted: fixtureSellers().length };
}

async function main() {
  const { registry, scope, counties } = countyScopeFromArgv();
  const marionInScope = counties.some(isMarion);
  const otherCounties = counties.filter((county) => !isMarion(county));

  if (marionInScope && otherCounties.length === 0) {
    const marion = await runMarionCounty();
    log("scrape:sellers done");
    printSummary({
      job: "sellers",
      scope,
      rows: marion.rows.length,
      inserted: marion.inserted,
      countiesOk: 1,
      countiesFailed: 0,
    });
    return;
  }

  log(`scrape:sellers start — county scope "${scope}" (${counties.length} counties)`);
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

  const result = await runCountyJob("sellers", otherCounties, registry);
  merged.push(...toCsvRows(result.rows));

  const out = writeCsv("indiana-sellers.csv", merged);
  log(`wrote ${merged.length} merged rows → ${out}`);

  const persisted = await persistCountyLeads(result.rows, registry);
  log(
    `counties ok=${result.succeeded.length} failed=${result.failed.length} inserted=${persisted.inserted} skipped=${persisted.skipped}`,
  );
  for (const failure of result.failed) {
    log(`  failed: ${failure.county} — ${failure.error}`);
  }
  log("scrape:sellers done");
  printSummary({
    job: "sellers",
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
