import { spawn } from "node:child_process";
import { NextRequest } from "next/server";
import { loadCountyRegistry, resolveCounties } from "@/lib/counties";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCRIPTS = {
  buyers: "scripts/scrape-buyers.ts",
  sellers: "scripts/scrape-sellers.ts",
  probate: "scripts/scrape-probate.ts",
  intel: "scripts/scrape-intel.ts",
  all: "scripts/scrape-all.ts",
  canadian: "scripts/scrape-canadian-buyers.ts",
} as const;

/** Jobs that understand `--county=<scope>`. */
const COUNTY_AWARE_JOBS = new Set(["buyers", "sellers", "probate", "all"]);

type Job = keyof typeof SCRIPTS;

/** Validate a requested scope against config/counties.json before spawning. */
function safeCountyScope(scope: string): string | null {
  const normalized = scope.trim();
  if (!normalized) return null;
  try {
    const registry = loadCountyRegistry();
    resolveCounties(registry, normalized);
    return normalized;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    job?: string;
    marketSlug?: string;
    county?: string;
  };
  const job = body.job as Job | undefined;
  if (!job || !(job in SCRIPTS)) {
    return new Response(JSON.stringify({ error: "Invalid job" }), {
      status: 400,
    });
  }

  const args = ["tsx", SCRIPTS[job]];
  if (body.county && COUNTY_AWARE_JOBS.has(job)) {
    const scope = safeCountyScope(body.county);
    if (!scope) {
      return new Response(JSON.stringify({ error: "Invalid county scope" }), {
        status: 400,
      });
    }
    args.push(`--county=${scope}`);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const child = spawn("npx", args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MARKET_SLUG: body.marketSlug ?? "indianapolis",
        },
      });
      const push = (chunk: Buffer | string) => {
        controller.enqueue(encoder.encode(String(chunk)));
      };
      push(
        `[deal-desk] starting ${job} for market=${body.marketSlug ?? "indianapolis"}${body.county ? ` county=${body.county}` : ""}\n`,
      );
      child.stdout.on("data", push);
      child.stderr.on("data", push);
      child.on("close", (code) => {
        push(`\n[deal-desk] exit ${code ?? 0}\n`);
        controller.close();
      });
      child.on("error", (err) => {
        push(`\n[deal-desk] error: ${err.message}\n`);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
