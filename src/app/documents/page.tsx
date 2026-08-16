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
              <pre className="whitespace-pre-wrap rounded-md border border-white/10 bg-slate-950/60 p-3 font-mono text-xs leading-relaxed text-slate-200 backdrop-blur-sm">
                {withDisclaimer(t.body)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Generate a filled Buyer Blast from any deal detail page.
      </p>
    </div>
  );
}
