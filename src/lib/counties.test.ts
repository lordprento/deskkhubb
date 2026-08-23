import { describe, expect, it } from "vitest";
import {
  countyHosts,
  isMarionOnly,
  loadCountyRegistry,
  normalizeCountySlug,
  parseCountyArg,
  resolveCounties,
} from "@/lib/counties";

const registry = loadCountyRegistry();

describe("loadCountyRegistry", () => {
  it("loads the 10 configured Indiana counties", () => {
    expect(registry.state).toBe("IN");
    expect(registry.counties).toHaveLength(10);
    expect(registry.counties.map((c) => c.slug)).toEqual([
      "marion",
      "lake",
      "allen",
      "hamilton",
      "st-joseph",
      "elkhart",
      "tippecanoe",
      "porter",
      "hendricks",
      "johnson",
    ]);
  });

  it("gives every county the urls and selectors the scrapers need", () => {
    for (const county of registry.counties) {
      expect(county.recorderUrl).toMatch(/^https:\/\//);
      expect(county.assessorUrl).toMatch(/^https:\/\//);
      expect(county.treasurerUrl).toMatch(/^https:\/\//);
      expect(county.courtUrl).toMatch(/^https:\/\//);
      expect(county.selectors.resultRow.length).toBeGreaterThan(0);
      expect(county.selectors.parcelId.length).toBeGreaterThan(0);
      expect(county.fipsCode).toMatch(/^18\d{3}$/);
    }
  });
});

describe("normalizeCountySlug", () => {
  it("normalizes punctuation and spacing", () => {
    expect(normalizeCountySlug("St. Joseph")).toBe("st-joseph");
    expect(normalizeCountySlug("  MARION ")).toBe("marion");
  });
});

describe("parseCountyArg", () => {
  it("reads --county=value", () => {
    expect(parseCountyArg(["--county=all"])).toBe("all");
    expect(parseCountyArg(["--county=marion"])).toBe("marion");
  });

  it("reads --county value", () => {
    expect(parseCountyArg(["--county", "lake"])).toBe("lake");
  });

  it("defaults to marion so existing runs are unchanged", () => {
    expect(parseCountyArg([])).toBe("marion");
    expect(parseCountyArg(["--verbose"])).toBe("marion");
  });

  it("ignores a flag-like value after --county", () => {
    expect(parseCountyArg(["--county", "--dry-run"])).toBe("marion");
  });
});

describe("resolveCounties", () => {
  it("expands 'all' to every county", () => {
    expect(resolveCounties(registry, "all")).toHaveLength(10);
  });

  it("resolves a single slug", () => {
    const [county] = resolveCounties(registry, "marion");
    expect(county.name).toBe("Marion");
  });

  it("resolves by display name and odd casing", () => {
    const [county] = resolveCounties(registry, "St. Joseph");
    expect(county.slug).toBe("st-joseph");
  });

  it("resolves a comma-separated list without duplicates", () => {
    const counties = resolveCounties(registry, "marion,lake,marion");
    expect(counties.map((c) => c.slug)).toEqual(["marion", "lake"]);
  });

  it("throws a helpful error for an unknown county", () => {
    expect(() => resolveCounties(registry, "nowhere")).toThrow(
      /Unknown county "nowhere"/,
    );
  });
});

describe("countyHosts", () => {
  it("collects hostnames for the scraper allowlist", () => {
    const hosts = countyHosts(registry);
    expect(hosts).toContain("www.indy.gov");
    expect(hosts).toContain("www.lakecountyin.org");
    expect(hosts).toContain("public.courts.in.gov");
    expect(hosts.every((h) => !h.includes("/"))).toBe(true);
  });
});

describe("isMarionOnly", () => {
  it("detects the legacy single-county scope", () => {
    expect(isMarionOnly(resolveCounties(registry, "marion"))).toBe(true);
    expect(isMarionOnly(resolveCounties(registry, "all"))).toBe(false);
    expect(isMarionOnly(resolveCounties(registry, "marion,lake"))).toBe(false);
  });
});
