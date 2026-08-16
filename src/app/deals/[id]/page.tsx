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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
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
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-1 font-inter text-xl font-semibold tracking-tight text-slate-50">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Funding</TableHead>
                <TableHead>Why</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-slate-50">
                    {b.name}
                  </TableCell>
                  <TableCell>{b.score.toFixed(0)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{b.funding ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {b.reasons.join(" · ")}
                  </TableCell>
                </TableRow>
              ))}
              {ranked.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-slate-400">
                    No buyers to rank
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BuyerBlastButton dealId={deal.id} />

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-slate-300">
            {deal.notes || "No notes yet."}
          </p>
          <p className="mt-4 text-xs text-slate-400">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deal.tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>
                      {t.dueAt ? format(t.dueAt, "MMM d") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {deal.tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-slate-400">
                      No tasks
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
                className="border-b border-white/10 pb-2 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{a.type}</Badge>
                  <span className="text-xs text-slate-400">
                    {format(a.createdAt, "MMM d, h:mm a")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{a.body}</p>
              </div>
            ))}
            {deal.activities.length === 0 && (
              <p className="text-sm text-slate-400">No activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
