/**
 * Run every scraper sequentially.
 *
 * Usage:
 *   npm run scrape:all                          # all counties, all jobs
 *   npm run scrape:all -- --county=marion       # Marion only (legacy CSVs)
 *   npm run scrape:all -- --county=lake,allen
 *   npm run scrape:all -- --jobs=buyers,sellers
 *   npm run scrape:all -- --no-canadian
 *
 * Each job is recorded in JobRun and a run summary is emailed (or logged when
 * SMTP is not configured).
 */
import { log } from "./scrape-lib";
import { parseCountyArg } from "../src/lib/counties";
import {
  DEFAULT_JOB_ORDER,
  parseJobsArg,
  runAllJobs,
  type JobName,
} from "./run-all-jobs";

async function main() {
  const argv = process.argv.slice(2);
  const scope = parseCountyArg(argv, "all");
  const explicitJobs = parseJobsArg(argv);
  const jobs: JobName[] = explicitJobs
    ? explicitJobs
    : argv.includes("--no-canadian")
      ? DEFAULT_JOB_ORDER.filter((job) => job !== "canadian")
      : DEFAULT_JOB_ORDER;

  log(`scrape:all start — scope=${scope} jobs=${jobs.join(",")}`);

  const result = await runAllJobs({
    scope,
    jobs,
    trigger: "MANUAL",
    notify: !argv.includes("--no-notify"),
  });

  const failed = result.outcomes.filter((outcome) => outcome.status === "FAILED");
  const inserted = result.outcomes.reduce(
    (total, outcome) => total + outcome.rowsInserted,
    0,
  );
  log(
    `scrape:all done — ${result.outcomes.length} jobs, ${inserted} rows inserted, ${failed.length} failed`,
  );

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
