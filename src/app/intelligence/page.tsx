import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function legalVariant(
  status: string,
): "health-green" | "health-yellow" | "health-red" | "health-unknown" {
  if (status === "PERMISSIVE") return "health-green";
  if (status === "LICENSE_REQUIRED") return "health-yellow";
  if (status === "PROHIBITED") return "health-red";
  return "health-unknown";
}

function rankScore(row: {
  buyerActivityScore: number | null;
  sellerActivityScore: number | null;
  competitorNoise: number | null;
  legalStatus: string;
}) {
  const buyer = row.buyerActivityScore ?? 0;
  const seller = row.sellerActivityScore ?? 0;
  const noise = row.competitorNoise ?? 0;
  const legalBoost =
    row.legalStatus === "PERMISSIVE"
      ? 15
      : row.legalStatus === "LICENSE_REQUIRED"
        ? 5
        : row.legalStatus === "PROHIBITED"
          ? -40
          : 0;
  // Prefer activity, lightly penalize crowded markets.
  return buyer * 0.45 + seller * 0.35 - noise * 0.4 + legalBoost;
}

export default async function IntelligencePage() {
  const markets = await prisma.market.findMany({
    include: { marketIntel: true },
    orderBy: { name: "asc" },
  });

  const ranked = markets
    .map((m) => {
      const intel = m.marketIntel;
      const score = intel
        ? rankScore(intel)
        : -100;
      return { market: m, intel, score };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Intelligence</h1>
        <p className="page-sub">
          Ranked markets by legal climate, buyer/seller activity, and competitor
          noise — run <code>npm run scrape:intel</code>
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Market</th>
                <th>Legal</th>
                <th>Buyer score</th>
                <th>Seller score</th>
                <th>Noise</th>
                <th>Composite</th>
                <th>Sources</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, idx) => (
                <tr key={row.market.id}>
                  <td>{idx + 1}</td>
                  <td className="font-medium">
                    {row.market.name}, {row.market.state}
                  </td>
                  <td>
                    {row.intel ? (
                      <Badge variant={legalVariant(row.intel.legalStatus)}>
                        {row.intel.legalStatus}
                      </Badge>
                    ) : (
                      <Badge variant="health-unknown">UNKNOWN</Badge>
                    )}
                  </td>
                  <td>{row.intel?.buyerActivityScore?.toFixed(0) ?? "—"}</td>
                  <td>{row.intel?.sellerActivityScore?.toFixed(0) ?? "—"}</td>
                  <td>{row.intel?.competitorNoise ?? "—"}</td>
                  <td className="font-medium">
                    {row.intel ? row.score.toFixed(1) : "—"}
                  </td>
                  <td className="max-w-[280px] truncate text-xs text-stone-500">
                    {row.intel?.sourceSummary ?? "No intel yet"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-xs text-stone-500">
        DRAFT — not legal advice. Attorney/title review required. Legal status is
        a research heuristic from public commission pages, not a compliance
        opinion.
      </p>
    </div>
  );
}
