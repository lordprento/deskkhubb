import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function legalStyles(status: string) {
  if (status === "PERMISSIVE") {
    return "bg-green-500/20 text-green-400 border-green-500/30";
  }
  if (status === "LICENSE_REQUIRED") {
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  }
  if (status === "PROHIBITED") {
    return "bg-red-500/20 text-red-400 border-red-500/30";
  }
  return "bg-slate-500/20 text-slate-400 border-slate-500/30";
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
      const score = intel ? rankScore(intel) : -100;
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Legal</TableHead>
                <TableHead>Buyer score</TableHead>
                <TableHead>Seller score</TableHead>
                <TableHead>Noise</TableHead>
                <TableHead>Composite</TableHead>
                <TableHead>Sources</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((row, idx) => (
                <TableRow key={row.market.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-medium text-slate-50">
                    {row.market.name}, {row.market.state}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        legalStyles(row.intel?.legalStatus ?? "UNKNOWN"),
                      )}
                    >
                      {row.intel?.legalStatus ?? "UNKNOWN"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.intel?.buyerActivityScore?.toFixed(0) ?? "—"}
                  </TableCell>
                  <TableCell>
                    {row.intel?.sellerActivityScore?.toFixed(0) ?? "—"}
                  </TableCell>
                  <TableCell>{row.intel?.competitorNoise ?? "—"}</TableCell>
                  <TableCell className="font-medium text-slate-50">
                    {row.intel ? row.score.toFixed(1) : "—"}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-slate-400">
                    {row.intel?.sourceSummary ?? "No intel yet"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-slate-400">
        DRAFT — not legal advice. Attorney/title review required. Legal status is
        a research heuristic from public commission pages, not a compliance
        opinion.
      </p>
    </div>
  );
}
