import { prisma } from "@/lib/db";
import { BuyerForm } from "@/components/forms/buyer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewBuyerPage() {
  const markets = await prisma.market.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">New buyer</h1>
        <p className="page-sub">Capture buy box and funding preferences</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Buyer profile</CardTitle>
        </CardHeader>
        <CardContent>
          <BuyerForm markets={markets} />
        </CardContent>
      </Card>
    </div>
  );
}
