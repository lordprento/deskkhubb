import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { underwriteDeal } from "@/lib/deal-math";
import { matchBuyers } from "@/lib/match-buyers";
import { formatMoney, formatPct } from "@/lib/utils";
import { HealthBadge } from "@/components/health-badge";
import { BuyerBlastButton } from "@/components/buyer-blast-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      market: true,
      tasks: { orderBy: { dueAt: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 10 },
      offers: { include: { buyer: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!deal) notFound();

  const buyers = await prisma.buyer.findMany();
  const u = underwriteDeal(deal);
  const ranked = matchBuyers(
    {
      marketId: deal.marketId,
      offerPrice: u.maxSellerOffer ?? deal.offerPrice,
      rehabCost: deal.rehabCost,
      arv: deal.arv,
    },
    buyers,
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">
            {deal.market.name} · {deal.status}
          </p>
          <h1 className="page-title">{deal.address}</h1>
          <p className="page-sub">
            {deal.city}, {deal.state} {deal.zip}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HealthBadge health={u.health} />
          <Button asChild variant="outline">
            <Link href="/deals">Back</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Buyer MAO", formatMoney(u.buyerMaxPurchasePrice)],
          ["Max seller offer", formatMoney(u.maxSellerOffer)],
          ["Assignment fee", formatMoney(u.assignmentFee)],
          ["Buyer margin", formatMoney(u.buyerProjectedMargin)],
          ["Discount to list", formatPct(u.discountToList)],
          ["ARV", formatMoney(deal.arv)],
          ["Rehab", formatMoney(deal.rehabCost)],
          ["List", formatMoney(deal.listPrice)],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-stone-500">
                {label}
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matched buyers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table>
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Score</th>
                <th>Funding</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td>{b.score.toFixed(0)}</td>
                  <td>
                    <Badge variant="secondary">{b.funding ?? "—"}</Badge>
                  </td>
                  <td className="text-xs text-stone-600">
                    {b.reasons.join(" · ")}
                  </td>
                </tr>
              ))}
              {ranked.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-stone-500">
                    No buyers to rank
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <BuyerBlastButton dealId={deal.id} />

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">
            {deal.notes || "No notes yet."}
          </p>
          <p className="mt-4 text-xs text-stone-500">
            DRAFT — not legal advice. Attorney/title review required.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deal.tasks.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{t.dueAt ? format(t.dueAt, "MMM d") : "—"}</td>
                    <td>
                      <Badge variant="secondary">{t.status}</Badge>
                    </td>
                  </tr>
                ))}
                {deal.tasks.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-stone-500">
                      No tasks
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deal.activities.map((a) => (
              <div
                key={a.id}
                className="border-b border-stone-100 pb-2 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{a.type}</Badge>
                  <span className="text-xs text-stone-500">
                    {format(a.createdAt, "MMM d, h:mm a")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-700">{a.body}</p>
              </div>
            ))}
            {deal.activities.length === 0 && (
              <p className="text-sm text-stone-500">No activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
