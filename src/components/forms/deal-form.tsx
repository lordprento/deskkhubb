"use client";

import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDeal } from "@/app/actions";
import { dealFormSchema, type DealFormValues } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MarketOption = { id: string; name: string; state: string };

export function DealForm({ markets }: { markets: MarketOption[] }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema) as Resolver<DealFormValues>,
    defaultValues: {
      marketId: markets[0]?.id ?? "",
      address: "",
      city: "",
      state: markets[0]?.state ?? "IN",
      zip: "",
      status: "LEAD",
      listPrice: null,
      arv: null,
      rehabCost: null,
      sellerAsk: null,
      offerPrice: null,
      assignmentFee: 10000,
      buyerDesiredProfit: 20000,
      buyBoxPct: 0.7,
      beds: null,
      baths: null,
      sqft: null,
      notes: "",
    },
  });

  const marketId = useWatch({ control: form.control, name: "marketId" });
  const status = useWatch({ control: form.control, name: "status" });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await createDeal(values);
    if (result && !result.ok) {
      setServerError("Could not save deal. Check required fields.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address">Property address</Label>
          <Input id="address" {...form.register("address")} />
          {form.formState.errors.address && (
            <p className="text-xs text-red-400">
              {form.formState.errors.address.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...form.register("city")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input id="state" maxLength={2} {...form.register("state")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zip">ZIP</Label>
            <Input id="zip" {...form.register("zip")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Market</Label>
          <Select
            value={marketId}
            onValueChange={(v) => form.setValue("marketId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select market" />
            </SelectTrigger>
            <SelectContent>
              {markets.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}, {m.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) =>
              form.setValue("status", v as DealFormValues["status"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "LEAD",
                "ANALYZING",
                "OFFERED",
                "UNDER_CONTRACT",
                "ASSIGNED",
                "CLOSED",
                "DEAD",
              ].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-inter text-sm font-semibold tracking-tight text-slate-100">
          Underwriting
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["listPrice", "List price"],
              ["arv", "ARV"],
              ["rehabCost", "Rehab"],
              ["sellerAsk", "Seller ask"],
              ["offerPrice", "Offer price"],
              ["assignmentFee", "Assignment fee"],
              ["buyerDesiredProfit", "Buyer profit target"],
              ["buyBoxPct", "Buy box % (0–1)"],
              ["beds", "Beds"],
              ["baths", "Baths"],
              ["sqft", "Sqft"],
            ] as const
          ).map(([name, label]) => (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={name}>{label}</Label>
              <Input
                id={name}
                type="number"
                step="any"
                {...form.register(name)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...form.register("notes")} />
      </div>

      {serverError && <p className="text-sm text-red-400">{serverError}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Create deal"}
        </Button>
        <p className="text-xs text-slate-400">
          DRAFT — not legal advice. Attorney/title review required.
        </p>
      </div>
    </form>
  );
}
