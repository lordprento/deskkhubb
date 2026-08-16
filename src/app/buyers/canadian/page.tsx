import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
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

export const dynamic = "force-dynamic";

export default async function CanadianBuyersPage() {
  const leads = await prisma.canadianBuyerLead.findMany({
    include: { market: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Canadian buyers</h1>
        <p className="page-sub">
          Leads flagged from county cash-buyer scrapes / intake
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Province</TableHead>
                <TableHead>Funding</TableHead>
                <TableHead>Buy box</TableHead>
                <TableHead>Max rehab</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-slate-400">
                    No Canadian buyer leads yet — run scrape:buyers.
                  </TableCell>
                </TableRow>
              )}
              {leads.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-slate-50">
                    {b.name}
                  </TableCell>
                  <TableCell>{b.market?.name ?? "—"}</TableCell>
                  <TableCell>{b.province ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{b.funding}</Badge>
                  </TableCell>
                  <TableCell>
                    {formatMoney(b.buyBoxMin)} – {formatMoney(b.buyBoxMax)}
                  </TableCell>
                  <TableCell>{formatMoney(b.maxRehab)}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-slate-400">
                    {b.sourceUrl ?? b.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-slate-400">
        DRAFT — not legal advice. Attorney/title review required.
      </p>
    </div>
  );
}
