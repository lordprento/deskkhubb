import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const filePath = url.startsWith("file:")
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), url.replace(/^file:/, ""))
    : url;
  const adapter = new PrismaBetterSqlite3({ url: `file:${filePath}` });
  return new PrismaClient({ adapter });
}

function getClient() {
  const existing = globalForPrisma.prisma;
  if (existing && (existing as { canadianBuyerLead?: unknown }).canadianBuyerLead) {
    return existing;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getClient();
