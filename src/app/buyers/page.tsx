import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Market</th>
                <th>Funding</th>
                <th>Buy box</th>
                <th>Max rehab</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td>{b.market?.name ?? "—"}</td>
                  <td>
                    <Badge variant="secondary">{b.funding}</Badge>
                  </td>
                  <td>
                    {formatMoney(b.buyBoxMin)} – {formatMoney(b.buyBoxMax)}
                  </td>
                  <td>{formatMoney(b.maxRehab)}</td>
                  <td className="text-xs text-stone-600">
                    <div>{b.email ?? "—"}</div>
                    <div>{b.phone ?? ""}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
