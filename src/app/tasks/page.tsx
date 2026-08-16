import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Deal</th>
                <th>Due</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.title}</td>
                  <td>
                    {t.deal ? (
                      <Link
                        href={`/deals/${t.deal.id}`}
                        className="hover:underline"
                      >
                        {t.deal.address}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{t.dueAt ? format(t.dueAt, "MMM d, yyyy") : "—"}</td>
                  <td>
                    <Badge variant="outline">{t.priority}</Badge>
                  </td>
                  <td>
                    <Badge variant="secondary">{t.status}</Badge>
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
