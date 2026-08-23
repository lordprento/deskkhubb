"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Play, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  setAutomationEnabled,
  updateAutomationSchedule,
} from "@/app/settings/automation/actions";
import { describeCron } from "@/lib/automation";
import { cn } from "@/lib/utils";

type CountyOption = { slug: string; name: string };

function lineTone(line: string) {
  const lower = line.toLowerCase();
  if (/\berror\b|\bfail(?:ed|ure)?\b|\bfatal\b|exit [1-9]/.test(lower)) {
    return "text-red-400";
  }
  if (/\bwarn(?:ing)?\b|\bskip(?:ped|ping)?\b|\btimeout\b|http (?:40|50)\d/.test(lower)) {
    return "text-yellow-400";
  }
  if (/\bsuccess\b|\bdone\b|\bcomplete(?:d)?\b|\bwrote\b|persisted|exit 0/.test(lower)) {
    return "text-green-400";
  }
  return "text-slate-300";
}

export function AutomationPanel({
  enabled,
  cronExpression,
  notifyEmail,
  timezone,
  counties,
}: {
  enabled: boolean;
  cronExpression: string;
  notifyEmail: string;
  timezone: string;
  counties: CountyOption[];
}) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [cronValue, setCronValue] = useState(cronExpression);
  const [emailValue, setEmailValue] = useState(notifyEmail);
  const [scope, setScope] = useState("all");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState("");
  const [running, setRunning] = useState(false);
  const [pending, startTransition] = useTransition();

  const logLines = useMemo(() => (log ? log.split(/\r?\n/) : []), [log]);

  function toggle() {
    const next = !isEnabled;
    setIsEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await setAutomationEnabled(next);
      setMessage(
        result.enabled
          ? "Weekly automation enabled."
          : "Weekly automation disabled.",
      );
    });
  }

  function saveSchedule() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateAutomationSchedule({
        cronExpression: cronValue,
        notifyEmail: emailValue,
      });
      if (result.ok) {
        setMessage("Schedule saved.");
      } else {
        setError(result.error);
      }
    });
  }

  async function runNow() {
    setRunning(true);
    setError(null);
    setMessage(null);
    setLog("");
    try {
      const res = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: "all", county: scope }),
      });
      if (!res.ok || !res.body) {
        setError(`Request failed: HTTP ${res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setLog(acc);
      }
      setMessage("Manual run finished — reload to refresh run history.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Weekly schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div>
              <p className="text-sm font-medium text-slate-100">
                Run all scrapers on a schedule
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {describeCron(cronValue)} · {timezone}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isEnabled ? "health-green" : "health-unknown"}>
                {isEnabled ? "Enabled" : "Disabled"}
              </Badge>
              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                aria-label="Toggle weekly automation"
                disabled={pending}
                onClick={toggle}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:opacity-60",
                  isEnabled
                    ? "border-sky-400/40 bg-sky-500/70"
                    : "border-white/15 bg-slate-700",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                    isEnabled ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cron">Cron expression</Label>
              <Input
                id="cron"
                value={cronValue}
                onChange={(e) => setCronValue(e.target.value)}
                placeholder="0 6 * * 1"
                className="font-mono"
              />
              <p className="text-xs text-slate-400">
                Default <code>0 6 * * 1</code> — Mondays at 06:00.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notify">Summary email</Label>
              <Input
                id="notify"
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="ops@example.com"
              />
              <p className="text-xs text-slate-400">
                Sent via SMTP when configured, otherwise logged.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" disabled={pending} onClick={saveSchedule}>
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="mr-2 h-4 w-4" />
              )}
              Save schedule
            </Button>
            {message && <span className="text-xs text-green-400">{message}</span>}
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>

          <p className="text-xs text-slate-400">
            Start the cron process with <code>npm run scheduler</code>. It reads
            this schedule, records every execution, and skips runs while
            automation is disabled.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual run</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-56 space-y-1.5">
              <Label>County scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Indiana counties</SelectItem>
                  {counties.map((county) => (
                    <SelectItem key={county.slug} value={county.slug}>
                      {county.name} County
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={running} onClick={runNow}>
              {running ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {running ? "Running all scrapers…" : "Run all scrapers now"}
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            Runs buyers → sellers → probate → Canadian sequentially, recording
            each into run history.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live log</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[420px] overflow-auto rounded-md border border-white/10 bg-slate-950/80 p-3 font-mono text-xs leading-relaxed backdrop-blur-sm">
            {logLines.length === 0 ? (
              <span className="text-slate-500">
                Start a manual run to stream logs here.
              </span>
            ) : (
              logLines.map((line, i) => (
                <span
                  key={`${i}-${line.slice(0, 24)}`}
                  className={cn("block", lineTone(line))}
                >
                  {line || " "}
                </span>
              ))
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
