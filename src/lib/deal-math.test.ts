import { describe, expect, it } from "vitest";
import {
  assignmentFee,
  buyerMaxPurchasePrice,
  buyerProjectedMargin,
  discountToList,
  getHealth,
  maxSellerOffer,
  underwriteDeal,
} from "./deal-math";

describe("buyerMaxPurchasePrice", () => {
  it("computes classic 70% rule MAO", () => {
    // 200_000 * 0.7 - 30_000 - 20_000 = 90_000
    expect(
      buyerMaxPurchasePrice({
        arv: 200_000,
        rehabCost: 30_000,
        buyerDesiredProfit: 20_000,
        buyBoxPct: 0.7,
      }),
    ).toBe(90_000);
  });

  it("returns null for empty / missing ARV", () => {
    expect(buyerMaxPurchasePrice({})).toBeNull();
    expect(buyerMaxPurchasePrice({ arv: null })).toBeNull();
  });

  it("returns null for zero ARV", () => {
    expect(buyerMaxPurchasePrice({ arv: 0, rehabCost: 0 })).toBeNull();
  });

  it("returns null for negative rehab or profit", () => {
    expect(
      buyerMaxPurchasePrice({ arv: 100_000, rehabCost: -1 }),
    ).toBeNull();
    expect(
      buyerMaxPurchasePrice({ arv: 100_000, buyerDesiredProfit: -5 }),
    ).toBeNull();
  });
});

describe("maxSellerOffer", () => {
  it("subtracts assignment fee from MAO", () => {
    expect(
      maxSellerOffer({ buyerMaxPurchasePrice: 90_000, assignmentFee: 10_000 }),
    ).toBe(80_000);
  });

  it("returns null when MAO missing", () => {
    expect(maxSellerOffer({ assignmentFee: 10_000 })).toBeNull();
  });

  it("returns null for negative fee", () => {
    expect(
      maxSellerOffer({ buyerMaxPurchasePrice: 90_000, assignmentFee: -1 }),
    ).toBeNull();
  });
});

describe("assignmentFee", () => {
  it("passes through valid fee", () => {
    expect(assignmentFee(7500)).toBe(7500);
  });

  it("rejects empty, negative, NaN", () => {
    expect(assignmentFee(undefined)).toBeNull();
    expect(assignmentFee(null)).toBeNull();
    expect(assignmentFee(-100)).toBeNull();
    expect(assignmentFee(Number.NaN)).toBeNull();
  });

  it("allows zero fee", () => {
    expect(assignmentFee(0)).toBe(0);
  });
});

describe("buyerProjectedMargin", () => {
  it("computes ARV − purchase − rehab − holding", () => {
    expect(
      buyerProjectedMargin({
        arv: 200_000,
        purchasePrice: 90_000,
        rehabCost: 30_000,
        holdingCosts: 5_000,
      }),
    ).toBe(75_000);
  });

  it("returns null for empty ARV or negative purchase", () => {
    expect(buyerProjectedMargin({ purchasePrice: 100 })).toBeNull();
    expect(
      buyerProjectedMargin({ arv: 100_000, purchasePrice: -1 }),
    ).toBeNull();
  });

  it("returns null for zero ARV", () => {
    expect(
      buyerProjectedMargin({ arv: 0, purchasePrice: 0 }),
    ).toBeNull();
  });
});

describe("discountToList", () => {
  it("computes discount ratio", () => {
    expect(
      discountToList({ listPrice: 100_000, offerPrice: 80_000 }),
    ).toBeCloseTo(0.2);
  });

  it("returns null for empty / zero list", () => {
    expect(discountToList({ offerPrice: 50_000 })).toBeNull();
    expect(discountToList({ listPrice: 0, offerPrice: 0 })).toBeNull();
  });

  it("returns null for negative offer", () => {
    expect(
      discountToList({ listPrice: 100_000, offerPrice: -1 }),
    ).toBeNull();
  });
});

describe("getHealth", () => {
  it("marks strong deals green", () => {
    expect(
      getHealth({
        arv: 200_000,
        assignmentFee: 10_000,
        buyerProjectedMargin: 40_000, // 20%
      }),
    ).toBe("green");
  });

  it("marks borderline deals yellow", () => {
    expect(
      getHealth({
        arv: 200_000,
        assignmentFee: 3_000,
        buyerProjectedMargin: 20_000, // 10%
      }),
    ).toBe("yellow");
  });

  it("marks weak deals red", () => {
    expect(
      getHealth({
        arv: 200_000,
        assignmentFee: 1_000,
        buyerProjectedMargin: 5_000,
      }),
    ).toBe("red");
  });

  it("returns unknown for empty inputs", () => {
    expect(getHealth({})).toBe("unknown");
    expect(getHealth({ arv: 0, assignmentFee: 0, buyerProjectedMargin: 0 })).toBe(
      "unknown",
    );
  });
});

describe("underwriteDeal", () => {
  it("wires the full snapshot", () => {
    const result = underwriteDeal({
      arv: 200_000,
      rehabCost: 30_000,
      buyerDesiredProfit: 20_000,
      buyBoxPct: 0.7,
      assignmentFee: 10_000,
      listPrice: 150_000,
    });
    expect(result.buyerMaxPurchasePrice).toBe(90_000);
    expect(result.maxSellerOffer).toBe(80_000);
    expect(result.assignmentFee).toBe(10_000);
    expect(result.discountToList).toBeCloseTo((150_000 - 80_000) / 150_000);
    expect(result.health).not.toBe("unknown");
  });
});
