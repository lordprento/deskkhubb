/**
 * Classification helpers for Canadian buyer leads harvested from public forums.
 * Pure functions so the scraper stays thin and the rules stay testable.
 */

export type LeadScoreValue = "HIGH" | "MEDIUM" | "LOW";

/** Intent keywords that promote a lead to HIGH. */
export const HIGH_INTENT_KEYWORDS = ["cash", "investment", "buying"] as const;

export const LEAD_SCORE_RANK: Record<LeadScoreValue, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const US_STATES: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

/** Canadian province/territory names and codes, for provenance tagging. */
export const CA_PROVINCES: Record<string, string> = {
  Alberta: "AB",
  "British Columbia": "BC",
  Manitoba: "MB",
  "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL",
  "Nova Scotia": "NS",
  Ontario: "ON",
  "Prince Edward Island": "PE",
  Quebec: "QC",
  Saskatchewan: "SK",
  "Northwest Territories": "NT",
  Nunavut: "NU",
  Yukon: "YT",
};

const CITY_TO_PROVINCE: Record<string, string> = {
  toronto: "ON",
  ottawa: "ON",
  hamilton: "ON",
  mississauga: "ON",
  vancouver: "BC",
  victoria: "BC",
  burnaby: "BC",
  calgary: "AB",
  edmonton: "AB",
  winnipeg: "MB",
  montreal: "QC",
  "quebec city": "QC",
  halifax: "NS",
  saskatoon: "SK",
  regina: "SK",
};

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

/**
 * True when the text plausibly refers to the United States.
 *
 * The bare two-letter form must be uppercase ("US"/"USA") so the English
 * pronoun "us" does not create false positives.
 */
export function mentionsUnitedStates(text: string): boolean {
  if (!text) return false;
  if (/\b(?:US|USA)\b/.test(text)) return true;
  if (/\bU\.\s?S\.?(?:A\.?)?/i.test(text)) return true;
  if (/\b(?:united states|stateside|america|american)\b/i.test(text)) return true;
  return extractTargetStates(text).length > 0;
}

/**
 * HIGH when the post shows buying intent ("cash", "investment", "buying"),
 * MEDIUM when it merely references the US, otherwise LOW.
 */
export function scoreCanadianPost(text: string | null | undefined): LeadScoreValue {
  const value = text ?? "";
  if (HIGH_INTENT_KEYWORDS.some((keyword) => hasWord(value, keyword))) {
    return "HIGH";
  }
  if (mentionsUnitedStates(value)) return "MEDIUM";
  return "LOW";
}

/** US states named in the text, by full name, de-duplicated and sorted. */
export function extractTargetStates(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const [name, abbreviation] of Object.entries(US_STATES)) {
    if (hasWord(text, name)) {
      found.add(name);
      continue;
    }
    // Two-letter codes must be uppercase to avoid matching words like "in" or "or".
    if (new RegExp(`\\b${abbreviation}\\b`).test(text)) {
      found.add(name);
    }
  }
  return Array.from(found).sort();
}

export function extractProvince(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const [name, code] of Object.entries(CA_PROVINCES)) {
    if (hasWord(text, name)) return code;
    if (new RegExp(`\\b${code}\\b`).test(text)) return code;
  }
  for (const [city, code] of Object.entries(CITY_TO_PROVINCE)) {
    if (hasWord(text, city)) return code;
  }
  return null;
}

const MONEY_PATTERN =
  /(?:\$|\bcad\b|\busd\b)?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k|m|mm|million|thousand)?\b/gi;

function moneyToNumber(amount: string, suffix?: string): number | null {
  const base = Number(amount.replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;
  const unit = (suffix ?? "").toLowerCase();
  if (unit === "k" || unit === "thousand") return base * 1_000;
  if (unit === "m" || unit === "mm" || unit === "million") return base * 1_000_000;
  return base;
}

/**
 * Budget figures mentioned in a post.
 *
 * A single figure is treated as a ceiling (buy-box max); two or more figures
 * become a range. Values below $10k are ignored as noise (dates, upvotes, etc).
 */
export function extractBudget(text: string | null | undefined): {
  min: number | null;
  max: number | null;
} {
  if (!text) return { min: null, max: null };

  const values: number[] = [];
  for (const match of text.matchAll(MONEY_PATTERN)) {
    const hasCurrencyContext =
      /\$|\bcad\b|\busd\b/i.test(match[0]) || Boolean(match[2]);
    if (!hasCurrencyContext) continue;
    const value = moneyToNumber(match[1], match[2]);
    if (value == null || value < 10_000 || value > 100_000_000) continue;
    values.push(value);
  }

  if (values.length === 0) return { min: null, max: null };
  if (values.length === 1) return { min: null, max: values[0] };

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
