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

- Next.js 15 (App Router) + TypeScript + Tailwind v4
- Prisma + SQLite (`prisma/schema.prisma`, `prisma/dev.db`)
- SheetJS (`xlsx`) for Excel import/export

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

Next, set up the local database:

```bash
cp .env.example .env      # DATABASE_URL for the local SQLite file — not committed
npx prisma db push        # creates prisma/dev.db from prisma/schema.prisma
npm run db:seed           # populates ~800 mock historic order rows across 8 quarters
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
3. **New Buy Plan** (`/buy-plans/new`) — upload a catalog file. Don't have one
   handy? Click "Download a sample catalog" on that page (or grab
   `public/sample-catalog.csv` directly) to try the flow end-to-end. Fill in
   the target quarter, optionally a brand to focus the trend read on, and an
   optional total budget, then "Generate Buy Plan" — you'll land on the
   editor for the plan it just created.

   Catalog files need columns for style, category, cost, and price. Header
   aliases like `SKU`/`style code`, `style`/`product`/`name`, `category`/`type`,
   `cost`/`wholesale`, `price`/`retail` are all recognized — see
   `src/lib/parseCatalog.ts` for the full list.
4. **Buy plan editor** (`/buy-plans/[id]`) — each line shows the recommended
   quantity, a confidence badge, and a "why?" link with the rationale. Edit
   the "Final Qty" column directly, "Save changes", then "Lock plan" once
   it's final (locking freezes editing). "Export to Excel" works in either
   state and produces a two-sheet workbook (line items + summary).
5. **Buy Plans** (`/buy-plans`) — every plan you've generated, draft or
   locked, with quarter/unit/cost totals at a glance.

## Resetting data

- `npm run db:seed` clears and regenerates historic orders only (buy plans
  are untouched).
- To wipe everything and start clean: delete `prisma/dev.db`, then re-run
  `npx prisma db push && npm run db:seed`.

## Recommendation engine — current state and roadmap

The recommendation engine (`src/lib/recommend.ts`) is currently **phase 1: a
deterministic, rule-based engine built entirely on this retailer's own historic
order data**. For each catalog item it:

- Finds comparable historic SKUs (same category, same-season analogs, token
  overlap on style name/color) and reads off their sell-through.
- Combines that with a placeholder trend score (`brandBuzzScore` in
  `recommend.ts`) standing in for a live signal.
- Produces a recommended quantity, confidence level, and a written rationale.

This was an intentional first step so the full app (upload → recommend → edit
→ lock → export) could be built and tested end-to-end before wiring live AI.
The next phase, not yet implemented, is to replace two specific seams without
touching anything else in the app:

- `brandBuzzScore(...)` → a Claude agent call with the web search tool,
  reading real trend signal for the given brand/category/quarter.
- `similarity(...)` → embeddings-based similarity (e.g. Voyage AI) instead of
  token overlap, for matching catalog items to historic SKUs.

Both require API keys (`ANTHROPIC_API_KEY`, embeddings provider key) that
aren't configured yet.

## Data model

See `prisma/schema.prisma`: `HistoricOrder`, `BuyPlan`, `BuyPlanItem`. Mock
historic data is generated deterministically by `prisma/seed.ts` — rerun
`npm run db:seed` any time to reset it.

## Scope notes

Single-retailer, no auth (by design, for now). Multi-tenancy and login can be
layered in later without a rebuild.
