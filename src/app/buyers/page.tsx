import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function BuyersPage() {
  const buyers = await prisma.buyer.findMany({
    include: { market: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Buyers</h1>
          <p className="page-sub">Cash and funded buy boxes by market</p>
        </div>
        <Button asChild>
          <Link href="/buyers/new">New buyer</Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Funding</TableHead>
                <TableHead>Buy box</TableHead>
                <TableHead>Max rehab</TableHead>
                <TableHead>Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buyers.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-slate-50">
                    {b.name}
                  </TableCell>
                  <TableCell>{b.market?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{b.funding}</Badge>
                  </TableCell>
                  <TableCell>
                    {formatMoney(b.buyBoxMin)} – {formatMoney(b.buyBoxMax)}
                  </TableCell>
                  <TableCell>{formatMoney(b.maxRehab)}</TableCell>
                  <TableCell className="text-xs text-slate-400">
                    <div>{b.email ?? "—"}</div>
                    <div>{b.phone ?? ""}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
