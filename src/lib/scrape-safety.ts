/**
 * Politeness helpers shared by the county scrapers: rotating user-agents and
 * randomized inter-request delays.
 *
 * Delay bounds default to 2–5s and can be shortened for local runs via
 * SCRAPE_MIN_DELAY_MS / SCRAPE_MAX_DELAY_MS.
 */

export const DEFAULT_MIN_DELAY_MS = 2_000;
export const DEFAULT_MAX_DELAY_MS = 5_000;

/** Desktop UA strings rotated across requests, plus our identifying research UA. */
export const USER_AGENTS = [
  "DealDeskResearchBot/0.1 (+local MVP; public records research)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
] as const;

/** Round-robin rotation — deterministic, so runs are reproducible. */
export function userAgentAt(index: number): string {
  const size = USER_AGENTS.length;
  const wrapped = ((index % size) + size) % size;
  return USER_AGENTS[wrapped];
}

export function createUserAgentRotator(startIndex = 0): () => string {
  let cursor = startIndex;
  return () => {
    const ua = userAgentAt(cursor);
    cursor += 1;
    return ua;
  };
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function delayBounds(): { min: number; max: number } {
  const min = envInt("SCRAPE_MIN_DELAY_MS", DEFAULT_MIN_DELAY_MS);
  const max = envInt("SCRAPE_MAX_DELAY_MS", DEFAULT_MAX_DELAY_MS);
  return max >= min ? { min, max } : { min: max, max: min };
}

/** Inclusive-ish random delay in [min, max]; rng injectable for tests. */
export function randomDelayMs(
  min: number = DEFAULT_MIN_DELAY_MS,
  max: number = DEFAULT_MAX_DELAY_MS,
  rng: () => number = Math.random,
): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.round(low + rng() * (high - low));
}

export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wait a random 2–5s (or the env-configured window) between requests. */
export async function politeDelay(
  rng: () => number = Math.random,
): Promise<number> {
  const { min, max } = delayBounds();
  const ms = randomDelayMs(min, max, rng);
  await sleep(ms);
  return ms;
}
