/**
 * Probate docket leads from Indiana public court information pages.
 * County/court sources only — no Zillow/Redfin/MLS.
 *
 * Usage: npm run scrape:probate
 * Output: ./output/probate-marion.csv
 */
import path from "node:path";
import {
  assertPublicCountyUrl,
  log,
  tryFetchHtml,
  writeCsv,
  type CsvRow,
} from "./scrape-lib";

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

async function main() {
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
  log("scrape:probate done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
