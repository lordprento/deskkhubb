"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type MarketOption = { id: string; name: string; state: string; slug: string };

function lineTone(line: string) {
  const lower = line.toLowerCase();
  if (
    /\berror\b|\bfail(?:ed|ure)?\b|\bfatal\b|\bexception\b/.test(lower) ||
    lower.startsWith("error:")
  ) {
    return "text-red-400";
  }
  if (
    /\bwarn(?:ing)?\b|\bskip(?:ped)?\b|\bretry\b|\btimeout\b/.test(lower)
  ) {
    return "text-yellow-400";
  }
  if (
    /\bsuccess\b|\bdone\b|\bcomplete(?:d)?\b|\bok\b|\bsaved\b|\bwrote\b/.test(
      lower,
    )
  ) {
    return "text-green-400";
  }
  return "text-slate-300";
}

export function ScraperPanel({ markets }: { markets: MarketOption[] }) {
  const [marketSlug, setMarketSlug] = useState(
    markets.find((m) => m.slug === "indianapolis")?.slug ??
      markets[0]?.slug ??
      "",
  );
  const [log, setLog] = useState("");
  const [running, setRunning] = useState<string | null>(null);

  const disabled = useMemo(
    () => Boolean(running) || !marketSlug,
    [running, marketSlug],
  );

  const logLines = useMemo(
    () => (log ? log.split(/\r?\n/) : []),
    [log],
  );

  async function run(job: "buyers" | "sellers" | "probate" | "intel") {
    setRunning(job);
    setLog("");
    try {
      const res = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job, marketSlug }),
      });
      if (!res.ok || !res.body) {
        setLog(`Request failed: HTTP ${res.status}`);
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
    } catch (e) {
      setLog(`Error: ${(e as Error).message}`);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>County scrapers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm space-y-1.5">
            <Label>Market</Label>
            <Select value={marketSlug} onValueChange={setMarketSlug}>
              <SelectTrigger>
                <SelectValue placeholder="Select market" />
              </SelectTrigger>
              <SelectContent>
                {markets.map((m) => (
                  <SelectItem key={m.id} value={m.slug}>
                    {m.name}, {m.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={disabled} onClick={() => run("buyers")}>
              {running === "buyers" ? "Running…" : "Scrape cash buyers"}
            </Button>
            <Button
              variant="secondary"
              disabled={disabled}
              onClick={() => run("sellers")}
            >
              {running === "sellers" ? "Running…" : "Scrape sellers"}
            </Button>
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => run("probate")}
            >
              {running === "probate" ? "Running…" : "Scrape probate"}
            </Button>
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => run("intel")}
            >
              {running === "intel" ? "Running…" : "Scrape market intel"}
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            County/court hosts for lead scrapers (never Zillow/Redfin/MLS). Intel
            uses state RE commission pages, Census/HUD public APIs, and public
            forum search. CSV lands in <code>./output/</code>.
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
                Run a scraper to stream logs here.
              </span>
            ) : (
              logLines.map((line, i) => (
                <span key={`${i}-${line.slice(0, 24)}`} className={cn("block", lineTone(line))}>
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
