-- CreateTable
CREATE TABLE "ScrapedLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT,
    "kind" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "recordedAt" DATETIME,
    "partyName" TEXT,
    "mailingAddress" TEXT,
    "propertyAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "amount" REAL,
    "documentType" TEXT,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScrapedLead_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CanadianBuyerLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "province" TEXT,
    "mailingAddress" TEXT,
    "buyBoxMin" REAL,
    "buyBoxMax" REAL,
    "maxRehab" REAL,
    "funding" TEXT NOT NULL DEFAULT 'CASH',
    "sourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CanadianBuyerLead_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketIntel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "legalStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "buyerActivityScore" REAL,
    "sellerActivityScore" REAL,
    "competitorNoise" INTEGER,
    "notes" TEXT,
    "sourceSummary" TEXT,
    "fetchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketIntel_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketIntel_marketId_key" ON "MarketIntel"("marketId");
