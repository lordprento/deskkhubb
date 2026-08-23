/**
 * Shared automation constants and cron formatting helpers used by the
 * /settings/automation page and its server actions.
 */

export const DEFAULT_CRON_EXPRESSION = "0 6 * * 1";
export const DEFAULT_TIMEZONE = "America/Indiana/Indianapolis";

export const AUTOMATION_JOBS = [
  { id: "buyers", label: "Cash buyers" },
  { id: "sellers", label: "Sellers" },
  { id: "probate", label: "Probate" },
  { id: "canadian", label: "Canadian buyers" },
] as const;

export type AutomationJobId = (typeof AUTOMATION_JOBS)[number]["id"];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Plain-English rendering of the common "minute hour * * dayOfWeek" shape. */
export function describeCron(expression: string): string {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return expression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const numericMinute = Number(minute);
  const numericHour = Number(hour);
  if (!Number.isInteger(numericMinute) || !Number.isInteger(numericHour)) {
    return expression;
  }

  const time = `${String(numericHour).padStart(2, "0")}:${String(numericMinute).padStart(2, "0")}`;
  if (dayOfMonth === "*" && month === "*") {
    if (dayOfWeek === "*") return `Every day at ${time}`;
    const day = DAY_NAMES[Number(dayOfWeek) % 7];
    if (day) return `Every ${day} at ${time}`;
  }
  return expression;
}

export function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1_000) return `${ms}ms`;
  const seconds = ms / 1_000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}
