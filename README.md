# Deal Desk

Wholesale operations MVP for deal intake, underwriting math, buyer/task tracking, and document drafts.

## Stack

Next.js App Router · TypeScript · Tailwind · shadcn-style UI · Prisma · SQLite · Zod · React Hook Form · date-fns · Lucide · Vitest

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
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
| `npm test` | Vitest (deal math + buyer matching) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Day-one workflow

1. Open **Today** — review open tasks and recent deal health.
2. **Add deal** — enter ARV, rehab, buy box %, assignment fee.
3. Open the deal detail — confirm **Buyer MAO**, **Max seller offer**, **Health**, and ranked buyers.
4. Run **Scraper** (or `npm run scrape:buyers`) for county cash buyers; review `/buyers/canadian`.
5. Use **Documents** templates (always includes legal disclaimer).

Scrapers only use public county/court hosts (never Zillow/Redfin/MLS). When live deed grids are blocked, fixtures for the last 6 months still write CSV so the pipeline is testable.

## Legal

Every generated document includes:

> DRAFT — not legal advice. Attorney/title review required.
