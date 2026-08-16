"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BuyerBlastButton({ dealId }: { dealId: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/buyer-blast?dealId=${dealId}`);
      const data = (await res.json()) as { content?: string; error?: string };
      if (!res.ok || !data.content) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setContent(data.content);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Buyer blast</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" onClick={generate} disabled={loading}>
            {loading ? "Generating…" : "Generate buyer blast"}
          </Button>
          {content && (
            <Button size="sm" variant="outline" onClick={copy}>
              Copy
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-stone-100 p-3 text-xs leading-relaxed text-stone-800">
          {content ??
            "One-click generate fills {{property_address}} tokens from this deal and appends the legal disclaimer."}
        </pre>
      </CardContent>
    </Card>
  );
}
