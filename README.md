# MODO — Data-Driven Buy Planning

A platform for retailers to forecast demand and build quarterly buy plans from
historic orders, catalog data, and fashion trend signals.

## What's here

Three tools, one quarterly workflow:

1. **Historic Orders** (`/historic-orders`) — browse, filter (quarter, category,
   brand, search), and export past orders to Excel.
2. **New Buy Plan** (`/buy-plans/new`) — upload next quarter's catalog (CSV/XLSX)
   and get recommended order quantities per item.
3. **Buy Plans** (`/buy-plans`, `/buy-plans/[id]`) — review and edit recommended
   quantities line by line, lock the plan when it's final, and export a
   ready-to-send Excel file.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- Prisma + Supabase PostgreSQL
- Supabase Auth and private Storage for embedded catalog images
- SheetJS and ExcelJS for CSV/Excel import, validation, and export

## First-time setup

Prerequisites: Node 20+ and npm.

```bash
git clone https://github.com/pelegOberlender/retail_ai_forecast.git
cd retail_ai_forecast
npm install
```

`npm install` triggers Prisma's client generator via a postinstall script. If
your npm is configured with a script-approval gate (you'll see
`npm warn allow-scripts` listing `prisma`, `@prisma/client`, etc.), approve
them so the generator can run:

```bash
npm approve-scripts   # follow the prompts, or:
npm approve-scripts @prisma/client @prisma/engines prisma sharp unrs-resolver esbuild fsevents
npm install            # re-run once scripts are approved
```

If you're not sure whether it ran, `npx prisma generate` is safe to run again
manually — it's idempotent.

Next, create `.env.local` from `.env.example` and add the Supabase values locally. Never commit or paste secrets into chat. Apply the checked-in PostgreSQL migration:

```bash
cp .env.example .env.local
npx prisma migrate deploy
```

Then run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Using it after setup

1. **Home** gives you the lay of the land and live counts from the seeded data.
2. **Historic Orders** (`/historic-orders`) — filter by quarter/category/brand
   or search, then "Export to Excel" to download the filtered set.
3. **New Buy Plan** (`/buy-plans/new`) — upload a catalog file, validate and
   map its columns, review warnings through server pagination, enter the plan
   brief, and confirm the preflight summary before generation. Don't have a
   catalog handy? Use `public/sample-catalog.csv`.

   Only an item-name column is strictly required — category is inferred by
   keyword when absent, and cost/price default to $0 (with a warning) rather
   than blocking the upload, so a real supplier linesheet import doesn't
   fail on missing columns. Header aliases include Hebrew (`שם פריט`, `צבע`,
   `מותג`, `ברקוד פריט`, …) alongside English (`style`/`product`/`name`,
   `category`/`type`, `cost`/`wholesale`, `price`/`retail`) — see
   `src/lib/parseCatalog.ts` for the full list. For `.xlsx`/`.xls` files,
   embedded product photos are extracted automatically (via ExcelJS, saved
   to `public/uploads/catalog/`) and show up as thumbnails in the buy plan
   editor — no image-URL column needed.
4. **Buy plan editor** (`/buy-plans/[id]`) — each line shows the recommended
   quantity, a confidence badge, and a "why?" link with the rationale. Edit
   the "Final Qty" column directly, "Save changes", then "Lock plan" once
   it's final (locking freezes editing). "Export to Excel" works in either
   state and produces a two-sheet workbook (line items + summary).
5. **Buy Plans** (`/buy-plans`) — every plan you've generated, draft or
   locked, with quarter/unit/cost totals at a glance.

## Data management

The active database is Supabase PostgreSQL. Use checked-in Prisma migrations
for schema changes. Do not delete or reset production data from local scripts.

## Recommendation engine — live AI, with a deterministic fallback

The recommendation engine (`src/lib/recommend.ts`) combines this retailer's
own historic order data with two live signals, each gated behind its own
API key so the app works fully without either:

- **Trend score** (`src/lib/ai/trend.ts`) — a Claude agent (`claude-opus-5`)
  with the web search tool, researching real trend momentum for the
  brand/category/quarter. Called once per category per plan (not once per
  item), and its written rationale is used directly in each line's "why?"
  panel. When `ANTHROPIC_API_KEY` is unset, trend evidence is omitted rather
  than replaced with an invented score.
- **Catalog-to-history similarity** (`src/lib/ai/embeddings.ts`) — Voyage AI
  embeddings (`voyage-3-lite`) comparing each catalog item to historic SKUs
  in the same category, replacing plain token overlap. Falls back to
  token-overlap matching when `VOYAGE_API_KEY` is unset.

Set either key in `.env.local` (see `.env.example`) and the corresponding signal
activates automatically on the next "Generate Buy Plan" — no code changes
needed. With no keys set, everything still works end to end on the
deterministic fallbacks; you'll just see heuristic trend/rationale text
instead of live web research.

## Data model

See `prisma/schema.prisma`: `HistoricOrder`, `BuyPlan`, `BuyPlanItem`. Mock
historic data is generated deterministically by `prisma/seed.ts` — rerun
`npm run db:seed` any time to reset it.

## Scope notes

Authentication is active through Supabase. The current product operates as a
single-retailer workspace; organization-level multi-tenancy and roles remain a
future milestone.
