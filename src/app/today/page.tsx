import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { underwriteDeal } from "@/lib/deal-math";
import { formatMoney } from "@/lib/utils";
import { HealthBadge } from "@/components/health-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [tasks, deals] = await Promise.all([
    prisma.task.findMany({
      where: { status: "OPEN" },
      include: { deal: true },
      orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
      take: 8,
    }),
    prisma.deal.findMany({
      include: { market: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Today</h1>
          <p className="page-sub">
            {format(new Date(), "EEEE, MMM d")} — tasks and live pipeline health
          </p>
        </div>
        <Button asChild>
          <Link href="/deals/new">Add deal</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Due</th>
                  <th>Pri</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="font-medium text-stone-900">{t.title}</div>
                      {t.deal && (
                        <div className="text-xs text-stone-500">
                          {t.deal.address}
                        </div>
                      )}
                    </td>
                    <td>
                      {t.dueAt ? format(t.dueAt, "MMM d") : "—"}
                    </td>
                    <td>{t.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent deals</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>MAO</th>
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
                          {d.market.name}
                        </div>
                      </td>
                      <td>{formatMoney(u.buyerMaxPurchasePrice)}</td>
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
    </div>
  );
}
