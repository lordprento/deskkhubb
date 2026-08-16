import { z } from "zod";

const optionalNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === "" || v == null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

export const dealFormSchema = z.object({
  marketId: z.string().min(1, "Market is required"),
  address: z.string().min(3, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required").max(2),
  zip: z.string().min(5, "ZIP is required"),
  status: z.enum([
    "LEAD",
    "ANALYZING",
    "OFFERED",
    "UNDER_CONTRACT",
    "ASSIGNED",
    "CLOSED",
    "DEAD",
  ]),
  listPrice: optionalNumber,
  arv: optionalNumber,
  rehabCost: optionalNumber,
  sellerAsk: optionalNumber,
  offerPrice: optionalNumber,
  assignmentFee: optionalNumber,
  buyerDesiredProfit: optionalNumber,
  buyBoxPct: optionalNumber,
  beds: optionalNumber,
  baths: optionalNumber,
  sqft: optionalNumber,
  notes: z.string().optional().nullable(),
});

export type DealFormValues = z.infer<typeof dealFormSchema>;

export const buyerFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  marketId: z.string().optional().nullable(),
  buyBoxMin: optionalNumber,
  buyBoxMax: optionalNumber,
  maxRehab: optionalNumber,
  funding: z.enum(["CASH", "HARD_MONEY", "CONVENTIONAL", "PRIVATE", "UNKNOWN"]),
  notes: z.string().optional().nullable(),
});

export type BuyerFormValues = z.infer<typeof buyerFormSchema>;
