-- AlterTable
ALTER TABLE "CanadianBuyerLead" ADD COLUMN "postExcerpt" TEXT;
ALTER TABLE "CanadianBuyerLead" ADD COLUMN "score" TEXT;
ALTER TABLE "CanadianBuyerLead" ADD COLUMN "sourceName" TEXT;
ALTER TABLE "CanadianBuyerLead" ADD COLUMN "targetStates" TEXT;

-- AlterTable
ALTER TABLE "ScrapedLead" ADD COLUMN "county" TEXT;
ALTER TABLE "ScrapedLead" ADD COLUMN "parcelId" TEXT;

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "rowsInserted" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "log" TEXT
);

-- CreateTable
CREATE TABLE "AutomationConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "cronExpression" TEXT NOT NULL DEFAULT '0 6 * * 1',
    "notifyEmail" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "JobRun_type_startedAt_idx" ON "JobRun"("type", "startedAt");

-- CreateIndex
CREATE INDEX "CanadianBuyerLead_score_idx" ON "CanadianBuyerLead"("score");

-- CreateIndex
CREATE INDEX "ScrapedLead_parcelId_idx" ON "ScrapedLead"("parcelId");

-- CreateIndex
CREATE INDEX "ScrapedLead_county_idx" ON "ScrapedLead"("county");
