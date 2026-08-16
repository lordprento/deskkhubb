import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
          <table>
            <thead>
              <tr>
                <th>Market</th>
                <th>State</th>
                <th>Slug</th>
                <th>Deals</th>
                <th>Buyers</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium">{m.name}</td>
                  <td>
                    <Badge variant="secondary">{m.state}</Badge>
                  </td>
                  <td className="font-mono text-xs">{m.slug}</td>
                  <td>{m._count.deals}</td>
                  <td>{m._count.buyers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
