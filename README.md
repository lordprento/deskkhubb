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
| `npm test` | Vitest (deal math) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Day-one workflow

1. Open **Today** — review open tasks and recent deal health.
2. **Add deal** — enter ARV, rehab, buy box %, assignment fee.
3. Open the deal detail — confirm **Buyer MAO**, **Max seller offer**, and **Health**.
4. Add buyers on `/buyers/new` matching market buy boxes.
5. Use **Documents** templates (always includes legal disclaimer).

## Legal

Every generated document includes:

> DRAFT — not legal advice. Attorney/title review required.
