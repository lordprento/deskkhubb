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
  const ok = ALLOWED_HOSTS.some(
    (a) => host === a || host.endsWith(`.${a.replace(/^www\./, "")}`),
  );
  if (!ok) {
    throw new Error(`Host not on county allowlist: ${host}`);
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

/** Attempt a lightweight fetch of a public page; returns HTML or null. */
export async function tryFetchHtml(url: string): Promise<string | null> {
  assertPublicCountyUrl(url);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "DealDeskResearchBot/0.1 (+local MVP; public records research)",
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
