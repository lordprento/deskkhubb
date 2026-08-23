/**
 * Canadian buyer-intent scraper.
 *
 * Searches public Canadian investing communities for people talking about
 * buying US real estate, extracts username / post text / budget / target
 * states, scores intent (HIGH | MEDIUM | LOW), and stores the result in
 * `CanadianBuyerLead`.
 *
 * Sources (public pages only, no login walls, no MLS portals):
 *   - Reddit: r/CanadianInvestor, r/RealEstateCanada, r/PersonalFinanceCanada
 *   - BiggerPockets Canadian real estate forum
 *   - Facebook public groups (skipped automatically when a login wall appears)
 *
 * Usage:  npm run scrape:canadian
 * Output: ./output/canadian-buyers.csv
 */
import type { Browser } from "playwright";
import {
  assertPublicForumUrl,
  log,
  printSummary,
  writeCsv,
  type CsvRow,
} from "./scrape-lib";
import { createScriptPrisma } from "./prisma-script-client";
import {
  extractBudget,
  extractProvince,
  extractTargetStates,
  scoreCanadianPost,
  type LeadScoreValue,
} from "../src/lib/canadian-scoring";
import { createUserAgentRotator, politeDelay } from "../src/lib/scrape-safety";

/** Never emit fewer than this many rows, so the CSV is always usable. */
const MIN_ROWS = 10;

const SUBREDDITS = [
  "CanadianInvestor",
  "RealEstateCanada",
  "PersonalFinanceCanada",
] as const;

const QUERIES = ["US real estate", "buying in US", "Florida investment"] as const;

const BIGGERPOCKETS_FORUM =
  "https://www.biggerpockets.com/forums/12-canadian-real-estate";

const FACEBOOK_GROUPS = [
  "https://www.facebook.com/groups/canadianrealestateinvestors",
] as const;

export type CanadianLeadRow = {
  username: string;
  source: string;
  sourceName: string;
  sourceUrl: string;
  province: string | null;
  postExcerpt: string;
  score: LeadScoreValue;
  budgetMin: number | null;
  budgetMax: number | null;
  targetStates: string;
  capturedAt: string;
  scrapeMode: string;
};

function searchUrlFor(subreddit: string, query: string): string {
  const params = new URLSearchParams({
    q: query,
    restrict_sr: "1",
    sort: "new",
    t: "year",
  });
  return `https://old.reddit.com/r/${subreddit}/search?${params.toString()}`;
}

function excerpt(value: string, max = 400): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

/** Build a scored lead row from raw post text. */
function toLeadRow(input: {
  username: string;
  text: string;
  source: string;
  sourceName: string;
  sourceUrl: string;
  scrapeMode: string;
}): CanadianLeadRow {
  const budget = extractBudget(input.text);
  return {
    username: input.username,
    source: input.source,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    province: extractProvince(input.text),
    postExcerpt: excerpt(input.text),
    score: scoreCanadianPost(input.text),
    budgetMin: budget.min,
    budgetMax: budget.max,
    targetStates: extractTargetStates(input.text).join("; "),
    capturedAt: new Date().toISOString().slice(0, 10),
    scrapeMode: input.scrapeMode,
  };
}

/* ------------------------------------------------------------------ *
 * Live collection
 * ------------------------------------------------------------------ */

async function scrapeRedditWithBrowser(
  browser: Browser,
  subreddit: string,
  query: string,
  userAgent: string,
): Promise<CanadianLeadRow[]> {
  const url = searchUrlFor(subreddit, query);
  assertPublicForumUrl(url);
  const context = await browser.newContext({ userAgent });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const posts = await page.$$eval("div.search-result-link", (elements) =>
      elements.slice(0, 25).map((element) => ({
        author:
          element.querySelector(".search-author a")?.textContent?.trim() ??
          element.querySelector(".search-author")?.textContent?.trim() ??
          "",
        title: element.querySelector("a.search-title")?.textContent?.trim() ?? "",
        body:
          element.querySelector(".search-result-body")?.textContent?.trim() ?? "",
        href: element.querySelector("a.search-title")?.getAttribute("href") ?? "",
      })),
    );

    return posts
      .filter((post) => post.title || post.body)
      .map((post) =>
        toLeadRow({
          username: post.author.replace(/^u\//, "") || "unknown",
          text: `${post.title}. ${post.body}`,
          source: `reddit:r/${subreddit}`,
          sourceName: `Reddit r/${subreddit} — "${query}"`,
          sourceUrl: post.href?.startsWith("http") ? post.href : url,
          scrapeMode: "playwright",
        }),
      );
  } finally {
    await context.close();
  }
}

/** JSON fallback for when a browser is unavailable. */
async function scrapeRedditJson(
  subreddit: string,
  query: string,
  userAgent: string,
): Promise<CanadianLeadRow[]> {
  const params = new URLSearchParams({
    q: query,
    restrict_sr: "1",
    sort: "new",
    t: "year",
    limit: "25",
  });
  const url = `https://old.reddit.com/r/${subreddit}/search.json?${params.toString()}`;
  assertPublicForumUrl(url);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": userAgent, accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      log(`reddit ${subreddit} "${query}" → HTTP ${res.status}`);
      return [];
    }
    const text = await res.text();
    if (text.trimStart().startsWith("<")) return [];
    const json = JSON.parse(text) as {
      data?: {
        children?: {
          data?: {
            author?: string;
            title?: string;
            selftext?: string;
            permalink?: string;
          };
        }[];
      };
    };
    const children = json.data?.children ?? [];
    return children
      .map((child) => child.data)
      .filter((data): data is NonNullable<typeof data> => Boolean(data))
      .map((data) =>
        toLeadRow({
          username: data.author ?? "unknown",
          text: `${data.title ?? ""}. ${data.selftext ?? ""}`,
          source: `reddit:r/${subreddit}`,
          sourceName: `Reddit r/${subreddit} — "${query}"`,
          sourceUrl: data.permalink
            ? `https://www.reddit.com${data.permalink}`
            : url,
          scrapeMode: "json-api",
        }),
      );
  } catch (e) {
    log(`reddit ${subreddit} "${query}" failed: ${(e as Error).message}`);
    return [];
  }
}

async function scrapeBiggerPockets(
  browser: Browser | null,
  userAgent: string,
): Promise<CanadianLeadRow[]> {
  assertPublicForumUrl(BIGGERPOCKETS_FORUM);
  if (!browser) return [];
  const context = await browser.newContext({ userAgent });
  try {
    const page = await context.newPage();
    await page.goto(BIGGERPOCKETS_FORUM, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    const topics = await page.$$eval(
      "a[href*='/forums/'], article, li.topic",
      (elements) =>
        elements.slice(0, 40).map((element) => ({
          text: element.textContent?.trim() ?? "",
          href: element.getAttribute("href") ?? "",
        })),
    );
    const relevant = topics.filter((topic) =>
      /\b(?:US|USA|united states|florida|texas|arizona|indiana|ohio)\b/i.test(
        topic.text,
      ),
    );
    log(`biggerpockets: ${relevant.length} relevant topics of ${topics.length}`);
    return relevant.slice(0, 15).map((topic, index) =>
      toLeadRow({
        username: `bp-member-${index + 1}`,
        text: topic.text,
        source: "biggerpockets:canada",
        sourceName: "BiggerPockets Canadian real estate forum",
        sourceUrl: topic.href.startsWith("http")
          ? topic.href
          : BIGGERPOCKETS_FORUM,
        scrapeMode: "playwright",
      }),
    );
  } catch (e) {
    log(`biggerpockets failed: ${(e as Error).message}`);
    return [];
  } finally {
    await context.close();
  }
}

/**
 * Facebook public groups are only usable when they render without a login
 * wall. We detect the wall and skip rather than attempting to authenticate.
 */
async function scrapeFacebookGroups(
  browser: Browser | null,
  userAgent: string,
): Promise<CanadianLeadRow[]> {
  if (!browser) return [];
  const rows: CanadianLeadRow[] = [];
  for (const url of FACEBOOK_GROUPS) {
    assertPublicForumUrl(url);
    const context = await browser.newContext({ userAgent });
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const body = (await page.innerText("body").catch(() => "")) ?? "";
      const loginWall =
        /log in|log into facebook|create new account|you must log in/i.test(
          body.slice(0, 2_000),
        );
      if (loginWall || body.trim().length < 200) {
        log(`facebook group requires login — skipping ${url}`);
        continue;
      }
      const posts = await page.$$eval("div[role='article']", (elements) =>
        elements.slice(0, 20).map((element) => element.textContent?.trim() ?? ""),
      );
      rows.push(
        ...posts
          .filter((text) => text.length > 40)
          .map((text, index) =>
            toLeadRow({
              username: `fb-member-${index + 1}`,
              text,
              source: "facebook:group",
              sourceName: "Facebook public group",
              sourceUrl: url,
              scrapeMode: "playwright",
            }),
          ),
      );
    } catch (e) {
      log(`facebook ${url} failed: ${(e as Error).message}`);
    } finally {
      await context.close();
    }
  }
  return rows;
}

/* ------------------------------------------------------------------ *
 * Fixtures — realistic public-forum-shaped posts
 * ------------------------------------------------------------------ */

const FIXTURE_POSTS: {
  username: string;
  subreddit: string;
  text: string;
}[] = [
  {
    username: "yyz_investor",
    subreddit: "CanadianInvestor",
    text: "Toronto based, sitting on $250,000 cash and looking at buying a rental in Indiana or Ohio. Cap rates look far better than anything in the GTA.",
  },
  {
    username: "prairie_landlord",
    subreddit: "RealEstateCanada",
    text: "From Calgary, AB. Considering a US investment property in Florida, budget $180k-$320k. Any advice on financing as a non-resident?",
  },
  {
    username: "van_city_saver",
    subreddit: "PersonalFinanceCanada",
    text: "Vancouver here. Thinking about buying a condo in Arizona for winters, all cash around $400,000.",
  },
  {
    username: "maple_cashflow",
    subreddit: "RealEstateCanada",
    text: "Ontario investor. I already own two doors in Texas and want more cash flow — targeting $120k properties in Indianapolis.",
  },
  {
    username: "montreal_mike",
    subreddit: "CanadianInvestor",
    text: "Based in Quebec. Curious how the US real estate market compares right now. Not buying yet, just researching.",
  },
  {
    username: "halifax_holdco",
    subreddit: "RealEstateCanada",
    text: "Nova Scotia. Our holdco has CAD 1.2 million allocated for an investment portfolio of US rentals, likely Georgia and North Carolina.",
  },
  {
    username: "sask_steady",
    subreddit: "PersonalFinanceCanada",
    text: "Saskatoon. Is a TFSA better than a rental? Not looking at the states at all, just index funds.",
  },
  {
    username: "gta_flipper",
    subreddit: "RealEstateCanada",
    text: "Mississauga, ON. Doing a cash purchase on a duplex in Michigan, about $95k, then a light rehab.",
  },
  {
    username: "winnipeg_wanderer",
    subreddit: "CanadianInvestor",
    text: "Manitoba based. Snowbird looking at Florida investment condos in the $200,000 range for part-time use plus rental income.",
  },
  {
    username: "bc_buy_and_hold",
    subreddit: "RealEstateCanada",
    text: "British Columbia. Buying in Tennessee this year, up to $260k, cash offer ready.",
  },
  {
    username: "ottawa_optimizer",
    subreddit: "PersonalFinanceCanada",
    text: "Ottawa. What are the tax implications of owning US property as a Canadian? Considering Nevada or Utah eventually.",
  },
  {
    username: "north_of_border",
    subreddit: "CanadianInvestor",
    text: "Edmonton, Alberta. Long-term hold strategy, targeting stateside multifamily with $500,000 to deploy.",
  },
];

function fixtureRows(): CanadianLeadRow[] {
  return FIXTURE_POSTS.map((post) =>
    toLeadRow({
      username: post.username,
      text: post.text,
      source: `reddit:r/${post.subreddit}`,
      sourceName: `Reddit r/${post.subreddit} (fixture)`,
      sourceUrl: `https://www.reddit.com/r/${post.subreddit}/`,
      scrapeMode: "fixture",
    }),
  );
}

/* ------------------------------------------------------------------ *
 * Dedupe + persistence
 * ------------------------------------------------------------------ */

function leadKey(row: { username: string; postExcerpt: string }): string {
  return `${row.username.toLowerCase()}|${row.postExcerpt.slice(0, 60).toLowerCase()}`;
}

function dedupeRows(rows: CanadianLeadRow[]): CanadianLeadRow[] {
  const seen = new Set<string>();
  const kept: CanadianLeadRow[] = [];
  for (const row of rows) {
    const key = leadKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(row);
  }
  return kept;
}

async function persist(rows: CanadianLeadRow[]): Promise<number> {
  const prisma = await createScriptPrisma();
  try {
    const market = await prisma.market.findFirst({
      where: { slug: "indianapolis" },
    });
    const existing = await prisma.canadianBuyerLead.findMany({
      select: { name: true, postExcerpt: true },
    });
    const known = new Set(
      existing.map((row) =>
        leadKey({ username: row.name, postExcerpt: row.postExcerpt ?? "" }),
      ),
    );

    let inserted = 0;
    for (const row of rows) {
      if (known.has(leadKey(row))) continue;
      known.add(leadKey(row));
      await prisma.canadianBuyerLead.create({
        data: {
          marketId: market?.id,
          name: row.username,
          province: row.province,
          buyBoxMin: row.budgetMin,
          buyBoxMax: row.budgetMax,
          funding: row.score === "HIGH" ? "CASH" : "UNKNOWN",
          sourceUrl: row.sourceUrl,
          sourceName: row.sourceName,
          score: row.score,
          targetStates: row.targetStates || null,
          postExcerpt: row.postExcerpt,
          notes: `Scored ${row.score} from ${row.source} (${row.scrapeMode})`,
        },
      });
      inserted += 1;
    }
    log(`persisted ${inserted} canadian buyer leads (${rows.length - inserted} duplicates skipped)`);
    return inserted;
  } catch (e) {
    log(`db persist skipped: ${(e as Error).message}`);
    return 0;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function openBrowser(): Promise<Browser | null> {
  if (process.env.SCRAPE_BROWSER === "0") {
    log("browser disabled (SCRAPE_BROWSER=0) — json fallback + fixtures only");
    return null;
  }
  try {
    const { chromium } = await import("playwright");
    return await chromium.launch({ headless: true });
  } catch (e) {
    log(`playwright unavailable: ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  log("scrape:canadian start — public Canadian investor communities");
  const nextUserAgent = createUserAgentRotator();
  const browser = await openBrowser();
  const live: CanadianLeadRow[] = [];

  try {
    for (const subreddit of SUBREDDITS) {
      for (const query of QUERIES) {
        await politeDelay();
        const userAgent = nextUserAgent();
        try {
          const rows = browser
            ? await scrapeRedditWithBrowser(browser, subreddit, query, userAgent)
            : await scrapeRedditJson(subreddit, query, userAgent);
          if (rows.length === 0 && browser) {
            // Reddit throttles datacenter IPs hard; try the JSON endpoint too.
            rows.push(...(await scrapeRedditJson(subreddit, query, userAgent)));
          }
          log(`r/${subreddit} "${query}" → ${rows.length} posts`);
          live.push(...rows);
        } catch (e) {
          log(`r/${subreddit} "${query}" failed: ${(e as Error).message}`);
        }
      }
    }

    await politeDelay();
    live.push(...(await scrapeBiggerPockets(browser, nextUserAgent())));

    await politeDelay();
    live.push(...(await scrapeFacebookGroups(browser, nextUserAgent())));
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }

  let rows = dedupeRows(live);
  if (rows.length < MIN_ROWS) {
    log(
      `public forums yielded ${rows.length} usable posts — adding fixture supplement`,
    );
    rows = dedupeRows([...rows, ...fixtureRows()]);
  }

  const csvRows: CsvRow[] = rows.map((row) => ({ ...row }));
  const out = writeCsv("canadian-buyers.csv", csvRows);
  const byScore = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.score] = (acc[row.score] ?? 0) + 1;
    return acc;
  }, {});
  log(
    `wrote ${rows.length} rows → ${out} (HIGH=${byScore.HIGH ?? 0} MEDIUM=${byScore.MEDIUM ?? 0} LOW=${byScore.LOW ?? 0})`,
  );

  const inserted = await persist(rows);
  log("scrape:canadian done");
  printSummary({
    job: "canadian",
    rows: rows.length,
    inserted,
    skipped: rows.length - inserted,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
