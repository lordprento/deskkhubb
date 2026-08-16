import { spawn } from "node:child_process";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCRIPTS = {
  buyers: "scripts/scrape-buyers.ts",
  sellers: "scripts/scrape-sellers.ts",
  probate: "scripts/scrape-probate.ts",
} as const;

type Job = keyof typeof SCRIPTS;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    job?: string;
    marketSlug?: string;
  };
  const job = body.job as Job | undefined;
  if (!job || !(job in SCRIPTS)) {
    return new Response(JSON.stringify({ error: "Invalid job" }), {
      status: 400,
    });
  }

  const script = SCRIPTS[job];
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const child = spawn("npx", ["tsx", script], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MARKET_SLUG: body.marketSlug ?? "indianapolis",
        },
      });
      const push = (chunk: Buffer | string) => {
        controller.enqueue(encoder.encode(String(chunk)));
      };
      push(`[deal-desk] starting ${job} for market=${body.marketSlug ?? "indianapolis"}\n`);
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
