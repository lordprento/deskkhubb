import Link from "next/link";
import { prisma } from "@/lib/db";
import { underwriteDeal } from "@/lib/deal-math";
import { formatMoney, formatPct } from "@/lib/utils";
import { HealthBadge } from "@/components/health-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
          <table>
            <thead>
              <tr>
                <th>Address</th>
                <th>Market</th>
                <th>Status</th>
                <th>ARV</th>
                <th>MAO</th>
                <th>Seller max</th>
                <th>Fee</th>
                <th>Disc.</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const u = underwriteDeal(d);
                return (
                  <tr key={d.id}>
                    <td>
                      <Link
                        href={`/deals/${d.id}`}
                        className="font-medium hover:underline"
                      >
                        {d.address}
                      </Link>
                      <div className="text-xs text-stone-500">
                        {d.city}, {d.state}
                      </div>
                    </td>
                    <td>{d.market.name}</td>
                    <td>{d.status}</td>
                    <td>{formatMoney(d.arv)}</td>
                    <td className="font-medium">
                      {formatMoney(u.buyerMaxPurchasePrice)}
                    </td>
                    <td>{formatMoney(u.maxSellerOffer)}</td>
                    <td>{formatMoney(u.assignmentFee)}</td>
                    <td>{formatPct(u.discountToList)}</td>
                    <td>
                      <HealthBadge health={u.health} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
