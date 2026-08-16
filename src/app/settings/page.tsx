import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Workspace defaults for Deal Desk MVP</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-300">
          <p>Database: SQLite (`dev.db`)</p>
          <p>Default buy box: 70% of ARV</p>
          <p>Default assignment fee target: $10,000</p>
          <p className="pt-2 text-xs text-slate-400">
            DRAFT — not legal advice. Attorney/title review required.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
