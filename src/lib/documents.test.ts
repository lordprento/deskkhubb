import { describe, expect, it } from "vitest";
import {
  applyTokens,
  renderDocument,
  dealToBuyerBlastTokens,
} from "./documents";
import { LEGAL_DISCLAIMER } from "./disclaimer";

describe("applyTokens", () => {
  it("replaces known tokens", () => {
    expect(
      applyTokens("Hello {{property_address}}", {
        property_address: "123 Main",
      }),
    ).toBe("Hello 123 Main");
  });

  it("uses em dash for missing tokens", () => {
    expect(applyTokens("X {{missing}}", {})).toBe("X —");
  });
});

describe("renderDocument", () => {
  it("always appends legal disclaimer", () => {
    const doc = renderDocument("buyer_blast", {
      property_address: "1 Test St",
      city: "Indianapolis",
      state: "IN",
    });
    expect(doc.content).toContain(LEGAL_DISCLAIMER);
    expect(doc.content).toContain("1 Test St");
  });
});

describe("dealToBuyerBlastTokens", () => {
  it("maps deal fields", () => {
    const tokens = dealToBuyerBlastTokens({
      address: "9 Oak",
      city: "Indy",
      state: "IN",
      arv: 200000,
      market: { name: "Indianapolis" },
    });
    expect(tokens.property_address).toBe("9 Oak");
    expect(tokens.market_name).toBe("Indianapolis");
    expect(String(tokens.arv)).toContain("200");
  });
});
