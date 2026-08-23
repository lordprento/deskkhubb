/**
 * Weekly scraper scheduler.
 *
 * Runs every scraper sequentially on a cron schedule (default: Mondays at
 * 06:00 America/Indiana/Indianapolis), records each execution in `JobRun`, and
 * sends an email summary on completion (falling back to logging when SMTP is
 * not configured).
 *
 * Usage:
 *   npm run scheduler                 # long-running cron process
 *   npm run scheduler -- --once       # run immediately and exit (manual/testing)
 *   npm run scheduler -- --cron="*\/5 * * * *"
 *   npm run scheduler -- --county=marion
 *
 * Schedule + on/off state live in AutomationConfig (edited from
 * /settings/automation); SCHEDULER_CRON / SCHEDULER_TZ override them.
 */
import cron from "node-cron";
import { log } from "./scrape-lib";
import { parseCountyArg } from "../src/lib/counties";
import { createScriptPrisma } from "./prisma-script-client";
import { parseJobsArg, runAllJobs, type JobName } from "./run-all-jobs";

export const DEFAULT_CRON = "0 6 * * 1";
const DEFAULT_TZ = "America/Indiana/Indianapolis";

type SchedulerConfig = {
  enabled: boolean;
  cronExpression: string;
  notifyEmail: string | null;
};

/** AutomationConfig row, created on first use, with env overrides applied. */
async function loadConfig(): Promise<SchedulerConfig> {
  const fallback: SchedulerConfig = {
    enabled: true,
    cronExpression: process.env.SCHEDULER_CRON ?? DEFAULT_CRON,
    notifyEmail: process.env.SUMMARY_EMAIL_TO ?? null,
  };

  try {
    const prisma = await createScriptPrisma();
    try {
      const config = await prisma.automationConfig.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default", enabled: false, cronExpression: DEFAULT_CRON },
      });
      return {
        enabled: config.enabled,
        cronExpression: process.env.SCHEDULER_CRON ?? config.cronExpression,
        notifyEmail: process.env.SUMMARY_EMAIL_TO ?? config.notifyEmail,
      };
    } finally {
      await prisma.$disconnect().catch(() => undefined);
    }
  } catch (e) {
    log(`could not read AutomationConfig (${(e as Error).message}) — using defaults`);
    return fallback;
  }
}

async function runOnce(
  scope: string,
  jobs: JobName[] | undefined,
  trigger: "MANUAL" | "SCHEDULED",
  notifyEmail: string | null,
) {
  const result = await runAllJobs({ scope, jobs, trigger, notifyEmail });
  const inserted = result.outcomes.reduce(
    (total, outcome) => total + outcome.rowsInserted,
    0,
  );
  const failed = result.outcomes.filter((o) => o.status === "FAILED").length;
  log(`run complete — ${inserted} rows inserted, ${failed} job(s) failed`);
  return result;
}

async function main() {
  const argv = process.argv.slice(2);
  const scope = parseCountyArg(argv, "all");
  const jobs = parseJobsArg(argv);
  const config = await loadConfig();

  const cronFlag = argv.find((arg) => arg.startsWith("--cron="));
  const expression = cronFlag
    ? cronFlag.slice("--cron=".length)
    : config.cronExpression;
  const timezone = process.env.SCHEDULER_TZ ?? DEFAULT_TZ;

  if (argv.includes("--once")) {
    log(`scheduler --once — running all jobs now (scope=${scope})`);
    await runOnce(scope, jobs, "MANUAL", config.notifyEmail);
    return;
  }

  if (!cron.validate(expression)) {
    log(`invalid cron expression "${expression}" — falling back to ${DEFAULT_CRON}`);
  }
  const safeExpression = cron.validate(expression) ? expression : DEFAULT_CRON;

  if (!config.enabled && !argv.includes("--force")) {
    log(
      "automation is disabled in AutomationConfig — enable it at /settings/automation or pass --force",
    );
    return;
  }

  const task = cron.schedule(
    safeExpression,
    async () => {
      log(`cron fired (${safeExpression} ${timezone})`);
      try {
        await runOnce(scope, jobs, "SCHEDULED", config.notifyEmail);
      } catch (e) {
        log(`scheduled run failed: ${(e as Error).message}`);
      }
    },
    { timezone, name: "deal-desk-weekly-scrape", noOverlap: true },
  );

  const next = task.getNextRun();
  log(
    `scheduler armed — "${safeExpression}" (${timezone}), scope=${scope}, next run ${next ? next.toISOString() : "unknown"}`,
  );
  log("press Ctrl+C to stop");

  const shutdown = async () => {
    log("shutting down scheduler");
    await task.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
