/**
 * Scraper orchestrator shared by the CLI (`scrape:all`) and the weekly
 * scheduler.
 *
 * Each scraper runs as its own child process so one crash can never take the
 * run down, and each job is recorded in `JobRun` (start, end, rows inserted,
 * status, error, log tail) which is what the /settings/automation page reads.
 */
import { spawn } from "node:child_process";
import { log, parseSummaries } from "./scrape-lib";
import { createScriptPrisma } from "./prisma-script-client";
import { sendRunSummary, type JobOutcome, type RunSummary } from "./notify";

export const JOB_SCRIPTS = {
  buyers: "scripts/scrape-buyers.ts",
  sellers: "scripts/scrape-sellers.ts",
  probate: "scripts/scrape-probate.ts",
  canadian: "scripts/scrape-canadian-buyers.ts",
} as const;

export type JobName = keyof typeof JOB_SCRIPTS;

export const DEFAULT_JOB_ORDER: JobName[] = [
  "buyers",
  "sellers",
  "probate",
  "canadian",
];

/** Tail of a child's output kept on the JobRun row for the UI log viewer. */
const LOG_TAIL_CHARS = 8_000;

export type RunAllOptions = {
  scope?: string;
  jobs?: JobName[];
  trigger?: "MANUAL" | "SCHEDULED";
  notify?: boolean;
  notifyEmail?: string | null;
  onLine?: (line: string) => void;
};

export type RunAllResult = {
  trigger: string;
  scope: string;
  startedAt: Date;
  endedAt: Date;
  outcomes: JobOutcome[];
};

type ChildResult = { code: number; output: string };

function runScript(
  script: string,
  args: string[],
  onLine?: (line: string) => void,
): Promise<ChildResult> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", script, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    const capture = (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      if (onLine) {
        for (const line of text.split(/\r?\n/)) {
          if (line.trim()) onLine(line);
        }
      }
    };

    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    child.on("error", (error) => {
      output += `\nspawn error: ${error.message}`;
      resolve({ code: 1, output });
    });
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

function tail(text: string): string {
  return text.length > LOG_TAIL_CHARS ? text.slice(-LOG_TAIL_CHARS) : text;
}

/**
 * Run the requested scrapers sequentially, recording each in `JobRun`.
 * A failing job is recorded and the run continues with the next job.
 */
export async function runAllJobs(
  options: RunAllOptions = {},
): Promise<RunAllResult> {
  const scope = options.scope ?? "all";
  const jobs = options.jobs ?? DEFAULT_JOB_ORDER;
  const trigger = options.trigger ?? "MANUAL";
  const startedAt = new Date();
  const outcomes: JobOutcome[] = [];

  const prisma = await createScriptPrisma().catch((e) => {
    log(`JobRun recording unavailable: ${(e as Error).message}`);
    return null;
  });

  for (const job of jobs) {
    const jobStart = new Date();
    log(`▶ ${job} (scope=${scope}, trigger=${trigger.toLowerCase()})`);

    let runId: string | null = null;
    if (prisma) {
      runId = await prisma.jobRun
        .create({
          data: { type: job, trigger, status: "RUNNING", startedAt: jobStart },
          select: { id: true },
        })
        .then((row) => row.id)
        .catch((e) => {
          log(`could not open JobRun for ${job}: ${(e as Error).message}`);
          return null;
        });
    }

    // Only the county scrapers understand --county.
    const args = job === "canadian" ? [] : [`--county=${scope}`];
    const { code, output } = await runScript(
      JOB_SCRIPTS[job],
      args,
      options.onLine,
    );

    const summaries = parseSummaries(output);
    const rowsInserted = summaries.reduce(
      (total, summary) => total + (summary.inserted ?? 0),
      0,
    );
    const countiesFailed = summaries.reduce(
      (total, summary) => total + (summary.countiesFailed ?? 0),
      0,
    );
    const status: JobOutcome["status"] = code === 0 ? "SUCCESS" : "FAILED";
    const error =
      code === 0
        ? countiesFailed > 0
          ? `${countiesFailed} county source(s) failed and were skipped`
          : null
        : `exit code ${code}`;
    const endedAt = new Date();

    outcomes.push({
      job,
      status,
      rowsInserted,
      durationMs: endedAt.getTime() - jobStart.getTime(),
      error,
    });

    if (prisma && runId) {
      await prisma.jobRun
        .update({
          where: { id: runId },
          data: {
            status,
            endedAt,
            rowsInserted,
            error,
            log: tail(output),
          },
        })
        .catch((e) => log(`could not close JobRun for ${job}: ${(e as Error).message}`));
    }

    log(
      `■ ${job} ${status} — ${rowsInserted} inserted in ${endedAt.getTime() - jobStart.getTime()}ms`,
    );
  }

  if (prisma) await prisma.$disconnect().catch(() => undefined);

  const result: RunAllResult = {
    trigger,
    scope,
    startedAt,
    endedAt: new Date(),
    outcomes,
  };

  if (options.notify !== false) {
    const summary: RunSummary = {
      trigger,
      scope,
      startedAt: result.startedAt,
      endedAt: result.endedAt,
      jobs: outcomes,
    };
    await sendRunSummary(summary, options.notifyEmail);
  }

  return result;
}

export function parseJobsArg(argv: string[]): JobName[] | undefined {
  const flag = argv.find((arg) => arg.startsWith("--jobs="));
  if (!flag) return undefined;
  const names = flag
    .slice("--jobs=".length)
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter((name): name is JobName => name in JOB_SCRIPTS);
  return names.length > 0 ? names : undefined;
}
