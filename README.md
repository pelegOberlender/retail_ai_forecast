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

## Getting started

```bash
npm install
npm run db:seed   # populates ~800 mock historic order rows across 8 quarters
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use
`public/sample-catalog.csv` to try the "New Buy Plan" upload without your own
data.

Catalog files need columns for style, category, cost, and price (aliases like
`SKU`/`style code`, `style`/`product`/`name`, `category`/`type`,
`cost`/`wholesale`, `price`/`retail` are all recognized — see
`src/lib/parseCatalog.ts`).

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
