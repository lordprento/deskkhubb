import fs from "node:fs";
import path from "node:path";

/** County / court public sources only — never MLS portals. */
export const ALLOWED_HOSTS = [
  "indy.gov",
  "www.indy.gov",
  "marioncountyin.gov",
  "www.marioncountyin.gov",
  "myoriononline.com",
  "search.indy.gov",
  "public.courts.in.gov",
  "www.in.gov",
  "in.gov",
] as const;

const BLOCKED_HOSTS = [
  "zillow.com",
  "redfin.com",
  "realtor.com",
  "mls.com",
  "brightmls.com",
  "har.com",
];

/**
 * Hosts contributed at runtime by `config/counties.json` so statewide runs can
 * reach other county portals. The Marion allowlist above stays authoritative on
 * its own; registration only ever widens the set.
 */
const extraAllowedHosts = new Set<string>();

export function registerAllowedHosts(hosts: readonly string[]): void {
  for (const host of hosts) {
    const normalized = host.trim().toLowerCase();
    if (normalized) extraAllowedHosts.add(normalized);
  }
}

export function allowedHosts(): string[] {
  return Array.from(new Set([...ALLOWED_HOSTS, ...extraAllowedHosts])).sort();
}

export function assertPublicCountyUrl(url: string): void {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (BLOCKED_HOSTS.some((b) => host === b || host.endsWith(`.${b}`))) {
    throw new Error(`Blocked non-county source: ${host}`);
  }
  const ok = allowedHosts().some(
    (a) => host === a || host.endsWith(`.${a.replace(/^www\./, "")}`),
  );
  if (!ok) {
    throw new Error(`Host not on county allowlist: ${host}`);
  }
}

/**
 * Public discussion sources used by the Canadian buyer scraper. Kept separate
 * from the county allowlist above so county scrapers can never wander onto a
 * forum (and vice versa). The MLS blocklist still applies to both.
 */
export const FORUM_ALLOWED_HOSTS = [
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "biggerpockets.com",
  "www.biggerpockets.com",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
] as const;

export function assertPublicForumUrl(url: string): void {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (BLOCKED_HOSTS.some((b) => host === b || host.endsWith(`.${b}`))) {
    throw new Error(`Blocked non-public source: ${host}`);
  }
  const ok = FORUM_ALLOWED_HOSTS.some(
    (a) => host === a || host.endsWith(`.${a.replace(/^www\./, "")}`),
  );
  if (!ok) {
    throw new Error(`Host not on forum allowlist: ${host}`);
  }
}

export type CsvRow = Record<string, string | number | null | undefined>;

export function ensureOutputDir(): string {
  const dir = path.resolve(process.cwd(), "output");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function toCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export function writeCsv(filename: string, rows: CsvRow[]): string {
  const dir = ensureOutputDir();
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, toCsv(rows), "utf8");
  return filePath;
}

export function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

export function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  return line;
}

/**
 * Machine-readable contract between the individual scrapers and the
 * orchestrator (`run-all-jobs.ts`). Emitted on stdout as a single JSON line so
 * the parent process never has to scrape human log text.
 */
export const SUMMARY_PREFIX = "[deal-desk:summary]";

export type JobSummary = {
  job: string;
  scope?: string;
  rows: number;
  inserted: number;
  skipped?: number;
  countiesOk?: number;
  countiesFailed?: number;
};

export function printSummary(summary: JobSummary): void {
  console.log(`${SUMMARY_PREFIX} ${JSON.stringify(summary)}`);
}

export function parseSummaries(output: string): JobSummary[] {
  const summaries: JobSummary[] = [];
  for (const line of output.split(/\r?\n/)) {
    const index = line.indexOf(SUMMARY_PREFIX);
    if (index === -1) continue;
    const json = line.slice(index + SUMMARY_PREFIX.length).trim();
    try {
      summaries.push(JSON.parse(json) as JobSummary);
    } catch {
      // Ignore malformed summary lines rather than failing the whole run.
    }
  }
  return summaries;
}

export const RESEARCH_USER_AGENT =
  "DealDeskResearchBot/0.1 (+local MVP; public records research)";

/**
 * Attempt a lightweight fetch of a public page; returns HTML or null.
 * `userAgent` defaults to the research UA so existing callers are unchanged;
 * statewide runs pass a rotated agent.
 */
export async function tryFetchHtml(
  url: string,
  userAgent: string = RESEARCH_USER_AGENT,
): Promise<string | null> {
  assertPublicCountyUrl(url);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": userAgent,
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      log(`fetch ${url} → HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    log(`fetch failed ${url}: ${(e as Error).message}`);
    return null;
  }
}
