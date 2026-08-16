import { withDisclaimer } from "@/lib/disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const templates = [
  {
    name: "Buyer Blast",
    body: `Subject: Off-market {{property_address}} — {{city}}, {{state}}

{{beds}}bd / {{baths}}ba · ARV {{arv}} · Rehab {{rehab}} · Asking {{offer_price}}

Assignment fee {{assignment_fee}}. Serious cash buyers only.`,
  },
  {
    name: "LOI",
    body: `Letter of Intent — {{property_address}}

Buyer: {{buyer_name}}
Offer: {{offer_price}}
Close: {{close_date}}
Earnest money: {{emd}}

This LOI is non-binding pending PSA.`,
  },
  {
    name: "Indiana Disclosure Checklist",
    body: `Indiana wholesale disclosure checklist for {{property_address}}

[ ] Seller disclosure form
[ ] Lead-based paint (pre-1978)
[ ] Assignment disclosure to all parties
[ ] Agency / licensing status confirmed
[ ] Title / judgment search ordered`,
  },
  {
    name: "EMD / Title Checklist",
    body: `EMD & title checklist — {{property_address}}

[ ] EMD wired to title: {{emd}}
[ ] Title opened with {{title_company}}
[ ] Access / lockbox confirmed
[ ] Inspection window noted
[ ] Assignment rider attached`,
  },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Documents</h1>
        <p className="page-sub">
          Templates with merge tokens — always include legal disclaimer
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.name}>
            <CardHeader>
              <CardTitle>{t.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-md bg-stone-100 p-3 text-xs leading-relaxed text-stone-800">
                {withDisclaimer(t.body)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
