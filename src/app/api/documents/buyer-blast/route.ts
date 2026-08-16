import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dealToBuyerBlastTokens, renderDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("dealId");
  if (!dealId) {
    return NextResponse.json({ error: "dealId required" }, { status: 400 });
  }
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { market: true },
  });
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  const doc = renderDocument("buyer_blast", dealToBuyerBlastTokens(deal));
  return NextResponse.json({
    name: doc.name,
    content: doc.content,
  });
}
