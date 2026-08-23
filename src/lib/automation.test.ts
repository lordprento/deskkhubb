import { describe, expect, it } from "vitest";
import {
  AUTOMATION_JOBS,
  DEFAULT_CRON_EXPRESSION,
  describeCron,
  formatDuration,
} from "@/lib/automation";

describe("describeCron", () => {
  it("describes the default weekly Monday schedule", () => {
    expect(describeCron(DEFAULT_CRON_EXPRESSION)).toBe("Every Monday at 06:00");
  });

  it("describes a daily schedule", () => {
    expect(describeCron("30 7 * * *")).toBe("Every day at 07:30");
  });

  it("falls back to the raw expression when it is not a simple pattern", () => {
    expect(describeCron("*/5 * * * *")).toBe("*/5 * * * *");
    expect(describeCron("0 6 1 1 *")).toBe("0 6 1 1 *");
    expect(describeCron("nonsense")).toBe("nonsense");
  });
});

describe("formatDuration", () => {
  it("formats milliseconds, seconds, and minutes", () => {
    expect(formatDuration(420)).toBe("420ms");
    expect(formatDuration(2_300)).toBe("2.3s");
    expect(formatDuration(95_000)).toBe("1m 35s");
  });

  it("renders an em dash for unknown durations", () => {
    expect(formatDuration(null)).toBe("—");
  });
});

describe("AUTOMATION_JOBS", () => {
  it("covers the four scheduled scrapers in run order", () => {
    expect(AUTOMATION_JOBS.map((job) => job.id)).toEqual([
      "buyers",
      "sellers",
      "probate",
      "canadian",
    ]);
  });
});
