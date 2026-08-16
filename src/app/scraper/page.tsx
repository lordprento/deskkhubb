import { prisma } from "@/lib/db";
import { ScraperPanel } from "@/components/scraper-panel";

export const dynamic = "force-dynamic";

export default async function ScraperPage() {
  const markets = await prisma.market.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Scraper</h1>
        <p className="page-sub">
          Public county recorder / treasurer / probate jobs (Marion County focus)
        </p>
      </div>
      <ScraperPanel markets={markets} />
    </div>
  );
}
