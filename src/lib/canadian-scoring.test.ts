import { describe, expect, it } from "vitest";
import {
  extractBudget,
  extractProvince,
  extractTargetStates,
  mentionsUnitedStates,
  scoreCanadianPost,
} from "@/lib/canadian-scoring";

describe("scoreCanadianPost", () => {
  it("scores HIGH on cash intent", () => {
    expect(scoreCanadianPost("Paying cash for a duplex")).toBe("HIGH");
  });

  it("scores HIGH on investment intent", () => {
    expect(scoreCanadianPost("Looking at an investment property")).toBe("HIGH");
  });

  it("scores HIGH on buying intent", () => {
    expect(scoreCanadianPost("Thinking about buying next spring")).toBe("HIGH");
  });

  it("scores MEDIUM when only the US is referenced", () => {
    expect(scoreCanadianPost("Anyone rent out a place in the USA?")).toBe(
      "MEDIUM",
    );
  });

  it("scores MEDIUM when a US state is named", () => {
    expect(scoreCanadianPost("Curious about Florida property taxes")).toBe(
      "MEDIUM",
    );
  });

  it("scores LOW for unrelated chatter", () => {
    expect(scoreCanadianPost("My TFSA contribution room question")).toBe("LOW");
  });

  it("treats empty input as LOW", () => {
    expect(scoreCanadianPost(null)).toBe("LOW");
    expect(scoreCanadianPost("")).toBe("LOW");
  });

  it("high intent wins over a US mention", () => {
    expect(scoreCanadianPost("Buying in Ohio with cash")).toBe("HIGH");
  });
});

describe("mentionsUnitedStates", () => {
  it("matches uppercase abbreviations and long forms", () => {
    expect(mentionsUnitedStates("moving to the US")).toBe(true);
    expect(mentionsUnitedStates("USA rentals")).toBe(true);
    expect(mentionsUnitedStates("U.S. mortgage rules")).toBe(true);
    expect(mentionsUnitedStates("united states taxes")).toBe(true);
  });

  it("does not treat the pronoun 'us' as a country reference", () => {
    expect(mentionsUnitedStates("could you help us with a mortgage")).toBe(
      false,
    );
  });
});

describe("extractTargetStates", () => {
  it("finds named states", () => {
    expect(extractTargetStates("Looking at Florida and Texas")).toEqual([
      "Florida",
      "Texas",
    ]);
  });

  it("finds uppercase abbreviations", () => {
    expect(extractTargetStates("Deals in IN and OH")).toEqual([
      "Indiana",
      "Ohio",
    ]);
  });

  it("ignores lowercase words that collide with abbreviations", () => {
    expect(extractTargetStates("investing in or around town")).toEqual([]);
  });

  it("handles multi-word states", () => {
    expect(extractTargetStates("condo in North Carolina")).toEqual([
      "North Carolina",
    ]);
  });
});

describe("extractProvince", () => {
  it("maps province names and codes", () => {
    expect(extractProvince("I live in Ontario")).toBe("ON");
    expect(extractProvince("Based in BC")).toBe("BC");
  });

  it("falls back to major cities", () => {
    expect(extractProvince("from toronto originally")).toBe("ON");
  });

  it("returns null when nothing matches", () => {
    expect(extractProvince("no location here")).toBeNull();
  });
});

describe("extractBudget", () => {
  it("treats a single figure as a ceiling", () => {
    expect(extractBudget("budget is $150k")).toEqual({
      min: null,
      max: 150_000,
    });
  });

  it("reads a range", () => {
    expect(extractBudget("looking at $120k-$200k")).toEqual({
      min: 120_000,
      max: 200_000,
    });
  });

  it("expands comma-formatted and million suffixes", () => {
    expect(extractBudget("up to $1.2 million")).toEqual({
      min: null,
      max: 1_200_000,
    });
    expect(extractBudget("CAD 250,000 saved")).toEqual({
      min: null,
      max: 250_000,
    });
  });

  it("ignores small numbers without currency meaning", () => {
    expect(extractBudget("3 bedrooms and 2 baths in 2024")).toEqual({
      min: null,
      max: null,
    });
  });

  it("returns nulls for empty input", () => {
    expect(extractBudget(null)).toEqual({ min: null, max: null });
  });
});
