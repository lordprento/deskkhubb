import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { underwriteDeal } from "@/lib/deal-math";
import { formatMoney } from "@/lib/utils";
import { HealthBadge } from "@/components/health-badge";
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Pri</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium text-slate-50">{t.title}</div>
                      {t.deal && (
                        <div className="text-xs text-slate-400">
                          {t.deal.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {t.dueAt ? format(t.dueAt, "MMM d") : "—"}
                    </TableCell>
                    <TableCell>{t.priority}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent deals</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>MAO</TableHead>
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
                          {d.market.name}
                        </div>
                      </TableCell>
                      <TableCell>{formatMoney(u.buyerMaxPurchasePrice)}</TableCell>
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
    </div>
  );
}
