import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import { addDays } from "date-fns";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.offer.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.market.deleteMany();

  const indy = await prisma.market.create({
    data: {
      name: "Indianapolis",
      state: "IN",
      slug: "indianapolis",
    },
  });

  const vegas = await prisma.market.create({
    data: {
      name: "Las Vegas",
      state: "NV",
      slug: "las-vegas",
    },
  });

  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        marketId: indy.id,
        address: "1842 N College Ave",
        city: "Indianapolis",
        state: "IN",
        zip: "46202",
        status: "ANALYZING",
        listPrice: 165000,
        arv: 245000,
        rehabCost: 38000,
        sellerAsk: 145000,
        offerPrice: 118000,
        assignmentFee: 10000,
        buyerDesiredProfit: 25000,
        buyBoxPct: 0.7,
        beds: 3,
        baths: 1.5,
        sqft: 1320,
        notes: "Tired landlord, roof 8yrs, kitchen dated.",
      },
    }),
    prisma.deal.create({
      data: {
        marketId: indy.id,
        address: "5520 E 38th St",
        city: "Indianapolis",
        state: "IN",
        zip: "46218",
        status: "OFFERED",
        listPrice: 119000,
        arv: 175000,
        rehabCost: 42000,
        sellerAsk: 105000,
        offerPrice: 78000,
        assignmentFee: 8000,
        buyerDesiredProfit: 20000,
        buyBoxPct: 0.7,
        beds: 2,
        baths: 1,
        sqft: 980,
        notes: "Vacant, needs HVAC and paint.",
      },
    }),
    prisma.deal.create({
      data: {
        marketId: vegas.id,
        address: "4120 W Charleston Blvd",
        city: "Las Vegas",
        state: "NV",
        zip: "89102",
        status: "LEAD",
        listPrice: 389000,
        arv: 475000,
        rehabCost: 55000,
        sellerAsk: 360000,
        offerPrice: 305000,
        assignmentFee: 15000,
        buyerDesiredProfit: 40000,
        buyBoxPct: 0.75,
        beds: 4,
        baths: 2,
        sqft: 1780,
        notes: "Absentee owner in CA; cosmetic + flooring.",
      },
    }),
  ]);

  const buyers = await Promise.all([
    prisma.buyer.create({
      data: {
        name: "Midwest Cash Partners",
        email: "acquisitions@midwestcash.example",
        phone: "317-555-0142",
        marketId: indy.id,
        buyBoxMin: 60000,
        buyBoxMax: 180000,
        maxRehab: 50000,
        funding: "CASH",
        notes: "Prefers eastside Indy, closes in 14 days.",
      },
    }),
    prisma.buyer.create({
      data: {
        name: "Circle City Rehab LLC",
        email: "buy@circlecityrehab.example",
        phone: "317-555-0198",
        marketId: indy.id,
        buyBoxMin: 80000,
        buyBoxMax: 220000,
        maxRehab: 75000,
        funding: "HARD_MONEY",
      },
    }),
    prisma.buyer.create({
      data: {
        name: "Desert Flip Group",
        email: "deals@desertflip.example",
        phone: "702-555-0110",
        marketId: vegas.id,
        buyBoxMin: 200000,
        buyBoxMax: 450000,
        maxRehab: 80000,
        funding: "PRIVATE",
      },
    }),
    prisma.buyer.create({
      data: {
        name: "Maple Leaf Holdings",
        email: "ops@mapleleafholdings.example",
        phone: "416-555-0177",
        marketId: indy.id,
        buyBoxMin: 50000,
        buyBoxMax: 150000,
        maxRehab: 40000,
        funding: "CASH",
        notes: "Canadian buyer active in Marion County.",
      },
    }),
    prisma.buyer.create({
      data: {
        name: "Vegas Nest Capital",
        email: "intake@vegasnest.example",
        phone: "702-555-0166",
        marketId: vegas.id,
        buyBoxMin: 250000,
        buyBoxMax: 500000,
        maxRehab: 60000,
        funding: "CONVENTIONAL",
      },
    }),
  ]);

  const now = new Date();
  const taskDefs = [
    { title: "Pull comps for College Ave", dealId: deals[0].id, days: 0, priority: "HIGH" as const },
    { title: "Call seller agent — price check", dealId: deals[0].id, days: 1, priority: "HIGH" as const },
    { title: "Send buyer blast — College Ave", dealId: deals[0].id, days: 2, priority: "MEDIUM" as const },
    { title: "Order title search — 38th St", dealId: deals[1].id, days: 0, priority: "HIGH" as const },
    { title: "Follow up offer status", dealId: deals[1].id, days: 1, priority: "MEDIUM" as const },
    { title: "Scope HVAC quote", dealId: deals[1].id, days: 3, priority: "MEDIUM" as const },
    { title: "Verify absentee mailing address", dealId: deals[2].id, days: 0, priority: "HIGH" as const },
    { title: "Run Vegas buy-box match", dealId: deals[2].id, days: 1, priority: "MEDIUM" as const },
    { title: "Update market notes — Indy", dealId: null, days: 2, priority: "LOW" as const },
    { title: "Review disclosure checklist", dealId: null, days: 4, priority: "LOW" as const },
  ];

  await Promise.all(
    taskDefs.map((t) =>
      prisma.task.create({
        data: {
          title: t.title,
          dealId: t.dealId,
          dueAt: addDays(now, t.days),
          priority: t.priority,
          status: "OPEN",
        },
      }),
    ),
  );

  await prisma.activity.createMany({
    data: [
      {
        dealId: deals[0].id,
        type: "NOTE",
        body: "Seller motivated; vacant 60 days.",
      },
      {
        dealId: deals[1].id,
        buyerId: buyers[0].id,
        type: "CALL",
        body: "Buyer interested pending HVAC quote.",
      },
    ],
  });

  await prisma.offer.create({
    data: {
      dealId: deals[1].id,
      buyerId: buyers[0].id,
      amount: 82000,
      status: "SENT",
      notes: "Subject to inspection waiver.",
    },
  });

  console.log(
    `Seeded: 2 markets, ${deals.length} deals, ${buyers.length} buyers, ${taskDefs.length} tasks`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
