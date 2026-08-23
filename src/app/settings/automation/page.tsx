import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AutomationPanel } from "@/components/automation-panel";
import {
  AUTOMATION_JOBS,
  DEFAULT_CRON_EXPRESSION,
  DEFAULT_TIMEZONE,
  formatDuration,
} from "@/lib/automation";
import { loadCountyRegistry } from "@/lib/counties";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type JobStatus = "RUNNING" | "SUCCESS" | "FAILED";

function statusVariant(status: JobStatus) {
  if (status === "SUCCESS") return "health-green" as const;
  if (status === "FAILED") return "health-red" as const;
  return "health-yellow" as const;
}

function durationOf(startedAt: Date, endedAt: Date | null): number | null {
  if (!endedAt) return null;
  return endedAt.getTime() - startedAt.getTime();
}

export default async function AutomationSettingsPage() {
  const registry = loadCountyRegistry();
  const [config, recentRuns] = await Promise.all([
    prisma.automationConfig.findUnique({ where: { id: "default" } }),
    prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 25 }),
  ]);

  const lastRunByJob = new Map(
    AUTOMATION_JOBS.map(({ id }) => [
      id,
      recentRuns.find((run) => run.type === id) ?? null,
    ]),
  );
  const lastRun = recentRuns[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Automation</h1>
        <p className="page-sub">
          Weekly Indiana-wide scraping across {registry.counties.length} counties
          plus Canadian buyer discovery
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AUTOMATION_JOBS.map(({ id, label }) => {
          const run = lastRunByJob.get(id) ?? null;
          return (
            <Card key={id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{label}</p>
                  {run ? (
                    <Badge variant={statusVariant(run.status as JobStatus)}>
                      {run.status}
                    </Badge>
                  ) : (
                    <Badge variant="health-unknown">Never run</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {run
                    ? `${run.rowsInserted} inserted · ${formatDuration(durationOf(run.startedAt, run.endedAt))}`
                    : "No run history yet"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {run ? run.startedAt.toISOString().replace("T", " ").slice(0, 19) : "—"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AutomationPanel
        enabled={config?.enabled ?? false}
        cronExpression={config?.cronExpression ?? DEFAULT_CRON_EXPRESSION}
        notifyEmail={config?.notifyEmail ?? ""}
        timezone={DEFAULT_TIMEZONE}
        counties={registry.counties.map((county) => ({
          slug: county.slug,
          name: county.name,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            Run history
            {lastRun && (
              <span className="ml-2 text-xs font-normal text-slate-400">
                last activity {lastRun.startedAt.toISOString().slice(0, 16).replace("T", " ")}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Log</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRuns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-slate-400">
                    No runs recorded yet — use the manual run button or start{" "}
                    <code>npm run scheduler</code>.
                  </TableCell>
                </TableRow>
              )}
              {recentRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium text-slate-50">
                    {run.type}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {run.trigger}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(run.status as JobStatus)}>
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {run.startedAt.toISOString().replace("T", " ").slice(0, 19)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {formatDuration(durationOf(run.startedAt, run.endedAt))}
                  </TableCell>
                  <TableCell>{run.rowsInserted}</TableCell>
                  <TableCell className="max-w-[420px]">
                    {run.log ? (
                      <details>
                        <summary className="cursor-pointer text-xs text-sky-300">
                          View log
                        </summary>
                        <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-all rounded-md border border-white/10 bg-slate-950/80 p-2 font-mono text-[11px] leading-relaxed text-slate-300">
                          {run.log}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                    {run.error && (
                      <p className="mt-1 text-[11px] text-red-400">{run.error}</p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400">
        DRAFT — not legal advice. Attorney/title review required.
      </p>
    </div>
  );
}
