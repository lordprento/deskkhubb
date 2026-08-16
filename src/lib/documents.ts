import { withDisclaimer } from "@/lib/disclaimer";
import { formatMoney } from "@/lib/utils";

export type DocTemplateId =
  | "buyer_blast"
  | "loi"
  | "indiana_disclosure"
  | "emd_title";

export type DocTokens = Record<string, string | number | null | undefined>;

export const DOC_TEMPLATES: Record<
  DocTemplateId,
  { name: string; body: string }
> = {
  buyer_blast: {
    name: "Buyer Blast",
    body: `Subject: Off-market {{property_address}} — {{city}}, {{state}}

{{beds}}bd / {{baths}}ba · ARV {{arv}} · Rehab {{rehab}} · Asking {{offer_price}}

Assignment fee {{assignment_fee}}. Serious cash buyers only.

Market: {{market_name}}
Status: {{status}}`,
  },
  loi: {
    name: "LOI",
    body: `Letter of Intent — {{property_address}}

Buyer: {{buyer_name}}
Offer: {{offer_price}}
Close: {{close_date}}
Earnest money: {{emd}}

This LOI is non-binding pending PSA.`,
  },
  indiana_disclosure: {
    name: "Indiana Disclosure Checklist",
    body: `Indiana wholesale disclosure checklist for {{property_address}}

[ ] Seller disclosure form
[ ] Lead-based paint (pre-1978)
[ ] Assignment disclosure to all parties
[ ] Agency / licensing status confirmed
[ ] Title / judgment search ordered`,
  },
  emd_title: {
    name: "EMD / Title Checklist",
    body: `EMD & title checklist — {{property_address}}

[ ] EMD wired to title: {{emd}}
[ ] Title opened with {{title_company}}
[ ] Access / lockbox confirmed
[ ] Inspection window noted
[ ] Assignment rider attached`,
  },
};

export function applyTokens(template: string, tokens: DocTokens): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = tokens[key];
    if (value == null || value === "") return "—";
    return String(value);
  });
}

export function renderDocument(
  id: DocTemplateId,
  tokens: DocTokens,
): { name: string; content: string } {
  const tpl = DOC_TEMPLATES[id];
  return {
    name: tpl.name,
    content: withDisclaimer(applyTokens(tpl.body, tokens)),
  };
}

export function dealToBuyerBlastTokens(deal: {
  address: string;
  city: string;
  state: string;
  beds?: number | null;
  baths?: number | null;
  arv?: number | null;
  rehabCost?: number | null;
  offerPrice?: number | null;
  assignmentFee?: number | null;
  status?: string | null;
  market?: { name?: string | null } | null;
}): DocTokens {
  return {
    property_address: deal.address,
    city: deal.city,
    state: deal.state,
    beds: deal.beds ?? "—",
    baths: deal.baths ?? "—",
    arv: formatMoney(deal.arv),
    rehab: formatMoney(deal.rehabCost),
    offer_price: formatMoney(deal.offerPrice),
    assignment_fee: formatMoney(deal.assignmentFee),
    market_name: deal.market?.name ?? "—",
    status: deal.status ?? "—",
    buyer_name: "{{buyer_name}}",
    close_date: "{{close_date}}",
    emd: "{{emd}}",
    title_company: "{{title_company}}",
  };
}
