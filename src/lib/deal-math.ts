/**
 * Pure wholesaling math used across Deal Desk.
 * All monetary inputs are expected in whole dollars (or dollars with cents).
 * Invalid numeric inputs yield null so callers can render "—" instead of NaN.
 */

export type HealthStatus = "green" | "yellow" | "red" | "unknown";

export type DealMathInput = {
  arv?: number | null;
  rehabCost?: number | null;
  buyerDesiredProfit?: number | null;
  buyBoxPct?: number | null;
  assignmentFee?: number | null;
  listPrice?: number | null;
  offerPrice?: number | null;
  purchasePrice?: number | null;
  holdingCosts?: number | null;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** End-buyer MAO: ARV × buyBoxPct − rehab − desired profit. */
export function buyerMaxPurchasePrice(input: {
  arv?: number | null;
  rehabCost?: number | null;
  buyerDesiredProfit?: number | null;
  buyBoxPct?: number | null;
}): number | null {
  const arv = input.arv;
  const rehabCost = input.rehabCost ?? 0;
  const buyerDesiredProfit = input.buyerDesiredProfit ?? 0;
  const buyBoxPct = input.buyBoxPct ?? 0.7;

  if (!isFiniteNumber(arv) || arv <= 0) return null;
  if (!isFiniteNumber(rehabCost) || rehabCost < 0) return null;
  if (!isFiniteNumber(buyerDesiredProfit) || buyerDesiredProfit < 0) return null;
  if (!isFiniteNumber(buyBoxPct) || buyBoxPct <= 0 || buyBoxPct > 1) return null;

  return arv * buyBoxPct - rehabCost - buyerDesiredProfit;
}

/** Max you can offer the seller: buyer MAO − your assignment fee. */
export function maxSellerOffer(input: {
  buyerMaxPurchasePrice?: number | null;
  assignmentFee?: number | null;
}): number | null {
  const mao = input.buyerMaxPurchasePrice;
  const fee = input.assignmentFee ?? 0;

  if (!isFiniteNumber(mao)) return null;
  if (!isFiniteNumber(fee) || fee < 0) return null;

  return mao - fee;
}

/** Assignment fee — pass-through with validation (negative / NaN → null). */
export function assignmentFee(fee?: number | null): number | null {
  if (!isFiniteNumber(fee) || fee < 0) return null;
  return fee;
}

/** Buyer projected profit if they buy at purchasePrice. */
export function buyerProjectedMargin(input: {
  arv?: number | null;
  purchasePrice?: number | null;
  rehabCost?: number | null;
  holdingCosts?: number | null;
}): number | null {
  const arv = input.arv;
  const purchasePrice = input.purchasePrice;
  const rehabCost = input.rehabCost ?? 0;
  const holdingCosts = input.holdingCosts ?? 0;

  if (!isFiniteNumber(arv) || arv <= 0) return null;
  if (!isFiniteNumber(purchasePrice) || purchasePrice < 0) return null;
  if (!isFiniteNumber(rehabCost) || rehabCost < 0) return null;
  if (!isFiniteNumber(holdingCosts) || holdingCosts < 0) return null;

  return arv - purchasePrice - rehabCost - holdingCosts;
}

/** (list − offer) / list. Zero/empty list → null. */
export function discountToList(input: {
  listPrice?: number | null;
  offerPrice?: number | null;
}): number | null {
  const listPrice = input.listPrice;
  const offerPrice = input.offerPrice;

  if (!isFiniteNumber(listPrice) || listPrice <= 0) return null;
  if (!isFiniteNumber(offerPrice) || offerPrice < 0) return null;

  return (listPrice - offerPrice) / listPrice;
}

/**
 * Health heuristic for pipeline tables.
 * - green: fee ≥ $5k and buyer margin ≥ 15% of ARV
 * - yellow: fee ≥ $2.5k and margin ≥ 8% of ARV
 * - red: otherwise when numbers are present
 * - unknown: missing inputs
 */
export function getHealth(input: {
  arv?: number | null;
  assignmentFee?: number | null;
  buyerProjectedMargin?: number | null;
}): HealthStatus {
  const arv = input.arv;
  const fee = input.assignmentFee;
  const margin = input.buyerProjectedMargin;

  if (!isFiniteNumber(arv) || arv <= 0) return "unknown";
  if (!isFiniteNumber(fee) || fee < 0) return "unknown";
  if (!isFiniteNumber(margin)) return "unknown";

  const marginPct = margin / arv;

  if (fee >= 5000 && marginPct >= 0.15) return "green";
  if (fee >= 2500 && marginPct >= 0.08) return "yellow";
  return "red";
}

/** Convenience: compute the full underwriting snapshot for a deal row. */
export function underwriteDeal(input: DealMathInput) {
  const mao = buyerMaxPurchasePrice({
    arv: input.arv,
    rehabCost: input.rehabCost,
    buyerDesiredProfit: input.buyerDesiredProfit,
    buyBoxPct: input.buyBoxPct,
  });
  const fee = assignmentFee(input.assignmentFee);
  const sellerMax = maxSellerOffer({
    buyerMaxPurchasePrice: mao,
    assignmentFee: fee,
  });
  const purchase =
    input.purchasePrice ?? input.offerPrice ?? sellerMax ?? null;
  const margin = buyerProjectedMargin({
    arv: input.arv,
    purchasePrice: purchase,
    rehabCost: input.rehabCost,
    holdingCosts: input.holdingCosts,
  });
  const discount = discountToList({
    listPrice: input.listPrice,
    offerPrice: input.offerPrice ?? sellerMax,
  });
  const health = getHealth({
    arv: input.arv,
    assignmentFee: fee,
    buyerProjectedMargin: margin,
  });

  return {
    buyerMaxPurchasePrice: mao,
    assignmentFee: fee,
    maxSellerOffer: sellerMax,
    buyerProjectedMargin: margin,
    discountToList: discount,
    health,
  };
}

export const LEGAL_DISCLAIMER =
  "DRAFT — not legal advice. Attorney/title review required.";
