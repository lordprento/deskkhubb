import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    include: { deal: true },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Tasks</h1>
        <p className="page-sub">Deal follow-ups and ops checklist</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-slate-50">
                    {t.title}
                  </TableCell>
                  <TableCell>
                    {t.deal ? (
                      <Link
                        href={`/deals/${t.deal.id}`}
                        className="transition-colors hover:text-sky-300"
                      >
                        {t.deal.address}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {t.dueAt ? format(t.dueAt, "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.status}</Badge>
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
