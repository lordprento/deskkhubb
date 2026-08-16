/**
 * Tax-delinquent / absentee owner leads from Marion County public pages.
 * County sources only — no Zillow/Redfin/MLS.
 *
 * Usage: npm run scrape:sellers
 * Output: ./output/sellers-marion.csv
 */
import path from "node:path";
import {
  assertPublicCountyUrl,
  log,
  monthsAgo,
  tryFetchHtml,
  writeCsv,
  type CsvRow,
} from "./scrape-lib";

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

async function main() {
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
  log("scrape:sellers done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
