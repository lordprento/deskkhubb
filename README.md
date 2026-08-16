# Deal Desk

Wholesale operations MVP for deal intake, underwriting math, buyer matching, county lead scrapers, market intelligence, and document drafts.

## Stack

Next.js App Router · TypeScript · Tailwind · shadcn-style UI · Prisma · SQLite · Zod · React Hook Form · date-fns · Lucide · Vitest · Playwright (optional for scrapers)

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npx playwright install          # optional, for live county page capture
sudo env "PATH=$PATH" npx playwright install-deps   # if host deps missing
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to `/today`).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run db:seed` | Seed Indy + Vegas markets, deals, buyers, tasks |
| `npm run scrape:buyers` | Marion County cash buyers → `./output/cash-buyers-marion.csv` |
| `npm run scrape:sellers` | Tax delinquent / absentee → `./output/sellers-marion.csv` |
| `npm run scrape:probate` | Probate dockets → `./output/probate-marion.csv` |
| `npm run scrape:intel` | Legal status + Census/HUD + forum noise → `MarketIntel` + CSV |
| `npm test` | Vitest (deal math, buyer matching, documents) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Day-one workflow

1. Open **Today** — review open tasks and recent deal health.
2. **Add deal** — enter ARV, rehab, buy box %, assignment fee.
3. Open the deal detail — confirm **Buyer MAO**, **Max seller offer**, **Health**, ranked buyers.
4. Click **Generate buyer blast** on the deal (includes legal disclaimer).
5. Run **Scraper** / `npm run scrape:buyers` for county cash buyers; review `/buyers/canadian`.
6. Run `npm run scrape:intel` and open **Intelligence** for ranked markets.
7. Use **Documents** templates (`{{property_address}}` tokens).

## Notes

- Lead scrapers only use public county/court hosts (never Zillow/Redfin/MLS).
- When live deed grids are blocked, fixtures for the last 6 months still write CSV.
- Market legal status is a research heuristic — **not** a compliance opinion.

## Legal

Every generated document includes:

> DRAFT — not legal advice. Attorney/title review required.
