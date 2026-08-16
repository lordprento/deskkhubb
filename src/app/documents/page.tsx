import { DOC_TEMPLATES } from "@/lib/documents";
import { withDisclaimer } from "@/lib/disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DocumentsPage() {
  const templates = Object.values(DOC_TEMPLATES);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Documents</h1>
        <p className="page-sub">
          Templates with merge tokens like {"{{property_address}}"} — every
          generated doc includes the legal disclaimer
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
      <p className="text-xs text-stone-500">
        Generate a filled Buyer Blast from any deal detail page.
      </p>
    </div>
  );
}
