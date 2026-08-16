"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { buyerFormSchema, dealFormSchema } from "@/lib/validators";

export async function createDeal(raw: unknown) {
  const parsed = dealFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const deal = await prisma.deal.create({
    data: {
      marketId: data.marketId,
      address: data.address,
      city: data.city,
      state: data.state.toUpperCase(),
      zip: data.zip,
      status: data.status,
      listPrice: data.listPrice,
      arv: data.arv,
      rehabCost: data.rehabCost,
      sellerAsk: data.sellerAsk,
      offerPrice: data.offerPrice,
      assignmentFee: data.assignmentFee,
      buyerDesiredProfit: data.buyerDesiredProfit,
      buyBoxPct: data.buyBoxPct ?? 0.7,
      beds: data.beds,
      baths: data.baths,
      sqft: data.sqft != null ? Math.round(data.sqft) : null,
      notes: data.notes || null,
    },
  });
  await prisma.activity.create({
    data: {
      dealId: deal.id,
      type: "CREATED",
      body: `Deal created for ${deal.address}`,
    },
  });
  revalidatePath("/deals");
  revalidatePath("/today");
  redirect(`/deals/${deal.id}`);
}

export async function createBuyer(raw: unknown) {
  const parsed = buyerFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const buyer = await prisma.buyer.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      marketId: data.marketId || null,
      buyBoxMin: data.buyBoxMin,
      buyBoxMax: data.buyBoxMax,
      maxRehab: data.maxRehab,
      funding: data.funding,
      notes: data.notes || null,
    },
  });
  revalidatePath("/buyers");
  redirect(`/buyers`);
  return { ok: true as const, id: buyer.id };
}
