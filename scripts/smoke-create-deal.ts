import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { underwriteDeal } from "../src/lib/deal-math";

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: `file:${path.resolve(process.cwd(), "dev.db")}`,
  });
  const prisma = new PrismaClient({ adapter });
  const market = await prisma.market.findFirst({
    where: { slug: "indianapolis" },
  });
  if (!market) throw new Error("Missing Indianapolis market — run npm run db:seed");

  const deal = await prisma.deal.create({
    data: {
      marketId: market.id,
      address: "901 Manual Test St",
      city: "Indianapolis",
      state: "IN",
      zip: "46201",
      status: "ANALYZING",
      listPrice: 140000,
      arv: 210000,
      rehabCost: 25000,
      buyerDesiredProfit: 20000,
      buyBoxPct: 0.7,
      assignmentFee: 10000,
      offerPrice: 92000,
    },
  });

  const u = underwriteDeal(deal);
  console.log(
    JSON.stringify(
      {
        id: deal.id,
        mao: u.buyerMaxPurchasePrice,
        sellerMax: u.maxSellerOffer,
        health: u.health,
        url: `/deals/${deal.id}`,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
