/**
 * Prisma client factory for standalone scripts (scrapers, scheduler).
 *
 * Mirrors what `src/lib/db.ts` does for the app, but resolves `dev.db` from the
 * current working directory the same way the existing scrapers do.
 */
import path from "node:path";

export async function createScriptPrisma() {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaBetterSqlite3 } = await import(
    "@prisma/adapter-better-sqlite3"
  );
  const adapter = new PrismaBetterSqlite3({
    url: `file:${path.resolve(process.cwd(), "dev.db")}`,
  });
  return new PrismaClient({ adapter });
}

export type ScriptPrisma = Awaited<ReturnType<typeof createScriptPrisma>>;
