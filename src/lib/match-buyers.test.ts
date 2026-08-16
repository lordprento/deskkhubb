import { describe, expect, it } from "vitest";
import { matchBuyers, scoreBuyerForDeal } from "./match-buyers";

const deal = {
  marketId: "indy",
  offerPrice: 100_000,
  rehabCost: 25_000,
};

describe("scoreBuyerForDeal", () => {
  it("scores same-market cash buyer in box highest", () => {
    const ranked = scoreBuyerForDeal(deal, {
      id: "1",
      name: "Cash Co",
      marketId: "indy",
      buyBoxMin: 60_000,
      buyBoxMax: 150_000,
      maxRehab: 40_000,
      funding: "CASH",
    });
    expect(ranked.score).toBe(40 + 35 + 20 + 30);
    expect(ranked.reasons).toContain("same market");
    expect(ranked.reasons).toContain("cash buyer");
  });

  it("penalizes different market and over-rehab", () => {
    const ranked = scoreBuyerForDeal(deal, {
      id: "2",
      name: "Vegas Buyer",
      marketId: "vegas",
      buyBoxMin: 80_000,
      buyBoxMax: 120_000,
      maxRehab: 10_000,
      funding: "CONVENTIONAL",
    });
    expect(ranked.reasons).toContain("different market");
    expect(ranked.reasons).toContain("rehab over cap");
    expect(ranked.score).toBeLessThan(60);
  });

  it("handles empty / missing buy box without throwing", () => {
    const ranked = scoreBuyerForDeal(
      { marketId: null, offerPrice: null, rehabCost: null },
      { id: "3", name: "Unknown" },
    );
    expect(ranked.score).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(ranked.reasons)).toBe(true);
  });
});

describe("matchBuyers", () => {
  it("returns empty array for empty buyers", () => {
    expect(matchBuyers(deal, [])).toEqual([]);
  });

  it("ranks best fit first", () => {
    const ranked = matchBuyers(deal, [
      {
        id: "a",
        name: "Out of market",
        marketId: "vegas",
        buyBoxMin: 50_000,
        buyBoxMax: 90_000,
        maxRehab: 5_000,
        funding: "CONVENTIONAL",
      },
      {
        id: "b",
        name: "Perfect Fit LLC",
        marketId: "indy",
        buyBoxMin: 70_000,
        buyBoxMax: 130_000,
        maxRehab: 50_000,
        funding: "CASH",
      },
    ]);
    expect(ranked[0]?.name).toBe("Perfect Fit LLC");
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });

  it("handles zero price and zero rehab", () => {
    const ranked = matchBuyers(
      { marketId: "indy", offerPrice: 0, rehabCost: 0 },
      [
        {
          id: "z",
          name: "Zero Box",
          marketId: "indy",
          buyBoxMin: 0,
          buyBoxMax: 0,
          maxRehab: 0,
          funding: "CASH",
        },
      ],
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.score).toBeGreaterThan(0);
  });
});
