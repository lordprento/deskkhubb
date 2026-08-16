import Link from "next/link";
import { prisma } from "@/lib/db";
import { underwriteDeal } from "@/lib/deal-math";
import { formatMoney, formatPct } from "@/lib/utils";
import { HealthBadge } from "@/components/health-badge";
import { Button } from "@/components/ui/button";
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

export default async function DealsPage() {
  const deals = await prisma.deal.findMany({
    include: { market: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Deals</h1>
          <p className="page-sub">
            Pipeline with MAO, assignment fee, and health
          </p>
        </div>
        <Button asChild>
          <Link href="/deals/new">New deal</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ARV</TableHead>
                <TableHead>MAO</TableHead>
                <TableHead>Seller max</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Disc.</TableHead>
                <TableHead>Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((d) => {
                const u = underwriteDeal(d);
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={`/deals/${d.id}`}
                        className="font-medium text-slate-50 transition-colors hover:text-sky-300"
                      >
                        {d.address}
                      </Link>
                      <div className="text-xs text-slate-400">
                        {d.city}, {d.state}
                      </div>
                    </TableCell>
                    <TableCell>{d.market.name}</TableCell>
                    <TableCell>{d.status}</TableCell>
                    <TableCell>{formatMoney(d.arv)}</TableCell>
                    <TableCell className="font-medium text-slate-50">
                      {formatMoney(u.buyerMaxPurchasePrice)}
                    </TableCell>
                    <TableCell>{formatMoney(u.maxSellerOffer)}</TableCell>
                    <TableCell>{formatMoney(u.assignmentFee)}</TableCell>
                    <TableCell>{formatPct(u.discountToList)}</TableCell>
                    <TableCell>
                      <HealthBadge health={u.health} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
