import { prisma } from "@/lib/db";
import { DealForm } from "@/components/forms/deal-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewDealPage() {
  const markets = await prisma.market.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">New deal</h1>
        <p className="page-sub">
          Capture underwriting inputs — MAO and health compute automatically
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Deal intake</CardTitle>
        </CardHeader>
        <CardContent>
          <DealForm markets={markets} />
        </CardContent>
      </Card>
    </div>
  );
}
