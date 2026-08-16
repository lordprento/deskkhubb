import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Market</th>
                <th>Province</th>
                <th>Funding</th>
                <th>Buy box</th>
                <th>Max rehab</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-stone-500">
                    No Canadian buyer leads yet — run scrape:buyers.
                  </td>
                </tr>
              )}
              {leads.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td>{b.market?.name ?? "—"}</td>
                  <td>{b.province ?? "—"}</td>
                  <td>
                    <Badge variant="secondary">{b.funding}</Badge>
                  </td>
                  <td>
                    {formatMoney(b.buyBoxMin)} – {formatMoney(b.buyBoxMax)}
                  </td>
                  <td>{formatMoney(b.maxRehab)}</td>
                  <td className="max-w-[220px] truncate text-xs text-stone-500">
                    {b.sourceUrl ?? b.notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-xs text-stone-500">
        DRAFT — not legal advice. Attorney/title review required.
      </p>
    </div>
  );
}
