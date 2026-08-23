import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_DELAY_MS,
  DEFAULT_MIN_DELAY_MS,
  USER_AGENTS,
  createUserAgentRotator,
  delayBounds,
  randomDelayMs,
  sleep,
  userAgentAt,
} from "@/lib/scrape-safety";

afterEach(() => {
  delete process.env.SCRAPE_MIN_DELAY_MS;
  delete process.env.SCRAPE_MAX_DELAY_MS;
});

describe("user agent rotation", () => {
  it("wraps around the pool", () => {
    expect(userAgentAt(0)).toBe(USER_AGENTS[0]);
    expect(userAgentAt(USER_AGENTS.length)).toBe(USER_AGENTS[0]);
    expect(userAgentAt(-1)).toBe(USER_AGENTS[USER_AGENTS.length - 1]);
  });

  it("hands out a different agent on each call", () => {
    const next = createUserAgentRotator();
    const seen = USER_AGENTS.map(() => next());
    expect(new Set(seen).size).toBe(USER_AGENTS.length);
    expect(next()).toBe(USER_AGENTS[0]);
  });
});

describe("randomDelayMs", () => {
  it("stays inside the 2-5s default window", () => {
    expect(randomDelayMs(DEFAULT_MIN_DELAY_MS, DEFAULT_MAX_DELAY_MS, () => 0)).toBe(
      2_000,
    );
    expect(randomDelayMs(DEFAULT_MIN_DELAY_MS, DEFAULT_MAX_DELAY_MS, () => 1)).toBe(
      5_000,
    );
    expect(
      randomDelayMs(DEFAULT_MIN_DELAY_MS, DEFAULT_MAX_DELAY_MS, () => 0.5),
    ).toBe(3_500);
  });

  it("tolerates swapped bounds", () => {
    expect(randomDelayMs(5_000, 2_000, () => 0)).toBe(2_000);
  });
});

describe("delayBounds", () => {
  it("defaults to 2-5 seconds", () => {
    expect(delayBounds()).toEqual({
      min: DEFAULT_MIN_DELAY_MS,
      max: DEFAULT_MAX_DELAY_MS,
    });
  });

  it("honors env overrides for fast local runs", () => {
    process.env.SCRAPE_MIN_DELAY_MS = "0";
    process.env.SCRAPE_MAX_DELAY_MS = "10";
    expect(delayBounds()).toEqual({ min: 0, max: 10 });
  });

  it("orders inverted overrides", () => {
    process.env.SCRAPE_MIN_DELAY_MS = "900";
    process.env.SCRAPE_MAX_DELAY_MS = "100";
    expect(delayBounds()).toEqual({ min: 100, max: 900 });
  });
});

describe("sleep", () => {
  it("resolves immediately for non-positive input", async () => {
    await expect(sleep(0)).resolves.toBeUndefined();
  });
});
