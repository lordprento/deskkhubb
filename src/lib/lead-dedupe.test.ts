import { describe, expect, it } from "vitest";
import {
  dedupeLeads,
  leadDedupeKey,
  normalizeAddress,
  normalizeParcelId,
  partitionNewLeads,
} from "@/lib/lead-dedupe";

describe("normalizeAddress", () => {
  it("collapses casing, punctuation, and street suffixes", () => {
    expect(normalizeAddress("1842 N. College Avenue")).toBe("1842 n college ave");
    expect(normalizeAddress("1842 North College Ave.")).toBe(
      "1842 n college ave",
    );
  });

  it("returns an empty string for missing values", () => {
    expect(normalizeAddress(null)).toBe("");
    expect(normalizeAddress(undefined)).toBe("");
  });
});

describe("normalizeParcelId", () => {
  it("strips formatting", () => {
    expect(normalizeParcelId("49-06-35-100-123.000-101")).toBe(
      "490635100123000101",
    );
  });

  it("is case insensitive", () => {
    expect(normalizeParcelId("A-1")).toBe(normalizeParcelId("a1"));
  });
});

describe("leadDedupeKey", () => {
  it("prefers parcel id", () => {
    expect(
      leadDedupeKey({ parcelId: "49-06-35", propertyAddress: "1 Main St" }),
    ).toBe("parcel:490635");
  });

  it("falls back to normalized address scoped by kind and county", () => {
    expect(
      leadDedupeKey({
        propertyAddress: "1842 N. College Avenue",
        county: "Marion",
        kind: "CASH_BUYER",
      }),
    ).toBe("addr:cash_buyer:marion:1842 n college ave");
  });

  it("returns null when neither identifier is usable", () => {
    expect(leadDedupeKey({ parcelId: null, propertyAddress: null })).toBeNull();
  });
});

describe("dedupeLeads", () => {
  it("keeps the first of each duplicate parcel", () => {
    const rows = [
      { parcelId: "A-1", propertyAddress: "1 Main St", note: "first" },
      { parcelId: "a1", propertyAddress: "1 Main Street", note: "second" },
    ];
    const result = dedupeLeads(rows);
    expect(result).toHaveLength(1);
    expect(result[0].note).toBe("first");
  });

  it("dedupes by address when parcel is missing", () => {
    const rows = [
      { propertyAddress: "1842 N College Ave", county: "marion", kind: "X" },
      { propertyAddress: "1842 N. College Avenue", county: "marion", kind: "X" },
      { propertyAddress: "1842 N College Ave", county: "lake", kind: "X" },
    ];
    expect(dedupeLeads(rows)).toHaveLength(2);
  });

  it("passes through rows with no dedupe identity", () => {
    const rows = [
      { parcelId: null, propertyAddress: null, documentType: "PAGE_INDEX" },
      { parcelId: null, propertyAddress: null, documentType: "PAGE_INDEX" },
    ];
    expect(dedupeLeads(rows)).toHaveLength(2);
  });
});

describe("partitionNewLeads", () => {
  it("separates rows already known to the database", () => {
    const rows = [
      { parcelId: "A-1", propertyAddress: "1 Main St" },
      { parcelId: "B-2", propertyAddress: "2 Main St" },
    ];
    const { fresh, duplicates } = partitionNewLeads(rows, ["parcel:a1"]);
    expect(fresh.map((r) => r.parcelId)).toEqual(["B-2"]);
    expect(duplicates.map((r) => r.parcelId)).toEqual(["A-1"]);
  });

  it("also collapses duplicates inside the incoming batch", () => {
    const rows = [
      { parcelId: "C-3", propertyAddress: "3 Main St" },
      { parcelId: "c3", propertyAddress: "3 Main Street" },
    ];
    const { fresh } = partitionNewLeads(rows, []);
    expect(fresh).toHaveLength(1);
  });
});
