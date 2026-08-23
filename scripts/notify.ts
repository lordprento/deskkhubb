/**
 * Run-summary notification.
 *
 * Sends the weekly scraper summary over SMTP when SMTP_HOST is configured,
 * otherwise writes the same report to the log. Email is intentionally optional
 * so a local install needs no credentials.
 *
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, SMTP_FROM,
 *      SUMMARY_EMAIL_TO (falls back to AutomationConfig.notifyEmail)
 */
import { log } from "./scrape-lib";

export type JobOutcome = {
  job: string;
  status: "SUCCESS" | "FAILED";
  rowsInserted: number;
  durationMs: number;
  error?: string | null;
};

export type RunSummary = {
  trigger: string;
  scope: string;
  startedAt: Date;
  endedAt: Date;
  jobs: JobOutcome[];
};

function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  const seconds = ms / 1_000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export function renderSummary(summary: RunSummary): {
  subject: string;
  text: string;
} {
  const failed = summary.jobs.filter((job) => job.status === "FAILED");
  const totalInserted = summary.jobs.reduce(
    (total, job) => total + job.rowsInserted,
    0,
  );
  const subject = `Deal Desk scrape ${failed.length === 0 ? "OK" : `— ${failed.length} failed`}: ${totalInserted} new leads`;

  const lines = [
    `Deal Desk scraper run (${summary.trigger.toLowerCase()})`,
    `County scope: ${summary.scope}`,
    `Started: ${summary.startedAt.toISOString()}`,
    `Finished: ${summary.endedAt.toISOString()}`,
    `Duration: ${formatDuration(summary.endedAt.getTime() - summary.startedAt.getTime())}`,
    "",
    "Jobs:",
    ...summary.jobs.map(
      (job) =>
        `  - ${job.job}: ${job.status} — ${job.rowsInserted} inserted in ${formatDuration(job.durationMs)}${job.error ? ` (${job.error})` : ""}`,
    ),
    "",
    `Total new leads: ${totalInserted}`,
  ];

  return { subject, text: lines.join("\n") };
}

export async function sendRunSummary(
  summary: RunSummary,
  recipientOverride?: string | null,
): Promise<"emailed" | "logged"> {
  const { subject, text } = renderSummary(summary);
  const host = process.env.SMTP_HOST;
  const to = recipientOverride || process.env.SUMMARY_EMAIL_TO;

  if (!host || !to) {
    log(`summary (email not configured — logging instead): ${subject}`);
    for (const line of text.split("\n")) log(`  ${line}`);
    return "logged";
  }

  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS ?? "",
          }
        : undefined,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "deal-desk@localhost",
      to,
      subject,
      text,
    });
    log(`emailed run summary to ${to}`);
    return "emailed";
  } catch (e) {
    log(`email failed (${(e as Error).message}) — logging summary instead`);
    for (const line of text.split("\n")) log(`  ${line}`);
    return "logged";
  }
}
