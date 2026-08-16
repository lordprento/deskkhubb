"use client";

import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBuyer } from "@/app/actions";
import { buyerFormSchema, type BuyerFormValues } from "@/lib/validators";
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

export function BuyerForm({ markets }: { markets: MarketOption[] }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<BuyerFormValues>({
    resolver: zodResolver(buyerFormSchema) as Resolver<BuyerFormValues>,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      marketId: markets[0]?.id ?? "",
      buyBoxMin: null,
      buyBoxMax: null,
      maxRehab: null,
      funding: "CASH",
      notes: "",
    },
  });

  const marketId = useWatch({ control: form.control, name: "marketId" });
  const funding = useWatch({ control: form.control, name: "funding" });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await createBuyer(values);
    if (result && !result.ok) {
      setServerError("Could not save buyer.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Buyer name</Label>
          <Input id="name" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-red-400">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...form.register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label>Market</Label>
          <Select
            value={marketId ?? undefined}
            onValueChange={(v) => form.setValue("marketId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Market" />
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
          <Label>Funding</Label>
          <Select
            value={funding}
            onValueChange={(v) =>
              form.setValue("funding", v as BuyerFormValues["funding"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["CASH", "HARD_MONEY", "CONVENTIONAL", "PRIVATE", "UNKNOWN"].map(
                (f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="buyBoxMin">Buy box min</Label>
          <Input id="buyBoxMin" type="number" {...form.register("buyBoxMin")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="buyBoxMax">Buy box max</Label>
          <Input id="buyBoxMax" type="number" {...form.register("buyBoxMax")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxRehab">Max rehab</Label>
          <Input id="maxRehab" type="number" {...form.register("maxRehab")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...form.register("notes")} />
      </div>
      {serverError && <p className="text-sm text-red-400">{serverError}</p>}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving…" : "Create buyer"}
      </Button>
    </form>
  );
}
