import { prisma } from "@/lib/db";
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

export default async function MarketsPage() {
  const markets = await prisma.market.findMany({
    include: {
      _count: { select: { deals: true, buyers: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Markets</h1>
        <p className="page-sub">Active wholesale markets</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Deals</TableHead>
                <TableHead>Buyers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markets.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-slate-50">
                    {m.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{m.state}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{m.slug}</TableCell>
                  <TableCell>{m._count.deals}</TableCell>
                  <TableCell>{m._count.buyers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
