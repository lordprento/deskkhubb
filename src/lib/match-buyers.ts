/**
 * Rank buyers for a deal by market fit, price box, rehab capacity, and funding.
 * Pure function — no I/O.
 */

export type MatchDeal = {
  marketId?: string | null;
  offerPrice?: number | null;
  rehabCost?: number | null;
  arv?: number | null;
};

export type MatchBuyer = {
  id: string;
  name: string;
  marketId?: string | null;
  buyBoxMin?: number | null;
  buyBoxMax?: number | null;
  maxRehab?: number | null;
  funding?: string | null;
};

export type RankedBuyer = MatchBuyer & {
  score: number;
  reasons: string[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Prefer cash / private / hard money for wholesale assignments. */
function fundingScore(funding?: string | null): { pts: number; reason?: string } {
  const f = (funding ?? "UNKNOWN").toUpperCase();
  if (f === "CASH") return { pts: 30, reason: "cash buyer" };
  if (f === "PRIVATE") return { pts: 22, reason: "private funds" };
  if (f === "HARD_MONEY") return { pts: 18, reason: "hard money" };
  if (f === "CONVENTIONAL") return { pts: 5, reason: "conventional (slower)" };
  return { pts: 0 };
}

export function scoreBuyerForDeal(
  deal: MatchDeal,
  buyer: MatchBuyer,
): RankedBuyer {
  let score = 0;
  const reasons: string[] = [];

  if (
    deal.marketId &&
    buyer.marketId &&
    deal.marketId === buyer.marketId
  ) {
    score += 40;
    reasons.push("same market");
  } else if (!deal.marketId || !buyer.marketId) {
    score += 5;
    reasons.push("market unknown");
  } else {
    reasons.push("different market");
  }

  const price = deal.offerPrice;
  if (isFiniteNumber(price)) {
    const min = buyer.buyBoxMin;
    const max = buyer.buyBoxMax;
    if (isFiniteNumber(min) && isFiniteNumber(max)) {
      if (price >= min && price <= max) {
        score += 35;
        reasons.push("price in buy box");
      } else if (price < min) {
        const gap = min - price;
        const pts = Math.max(0, 20 - gap / 5000);
        score += pts;
        reasons.push("below buy box");
      } else {
        reasons.push("above buy box");
      }
    } else {
      score += 8;
      reasons.push("no buy box set");
    }
  }

  const rehab = deal.rehabCost ?? 0;
  if (isFiniteNumber(rehab) && rehab >= 0) {
    const maxRehab = buyer.maxRehab;
    if (isFiniteNumber(maxRehab)) {
      if (rehab <= maxRehab) {
        score += 20;
        reasons.push("rehab within cap");
      } else {
        reasons.push("rehab over cap");
      }
    } else {
      score += 4;
      reasons.push("no rehab cap");
    }
  }

  const fund = fundingScore(buyer.funding);
  score += fund.pts;
  if (fund.reason) reasons.push(fund.reason);

  return { ...buyer, score, reasons };
}

export function matchBuyers(
  deal: MatchDeal,
  buyers: MatchBuyer[],
): RankedBuyer[] {
  if (!Array.isArray(buyers) || buyers.length === 0) return [];
  return buyers
    .map((b) => scoreBuyerForDeal(deal, b))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
