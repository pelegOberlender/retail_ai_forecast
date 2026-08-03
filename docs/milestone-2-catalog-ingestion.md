# Milestone 2 — Catalog ingestion and plan setup

## Outcome

Supplier catalogs now move through a durable five-step workflow:

1. Upload CSV, XLSX, or XLS (maximum 25 MB).
2. Validate rows, review warnings, and map unrecognized columns.
3. Set the target quarter, plan name, brand focus, and optional budget.
4. Review the evidence and commercial constraints that will be used.
5. Generate a buy plan from the persisted catalog products.

## Data and performance decisions

- Workbooks and embedded images are processed on the server only.
- The browser receives 12 preview rows at a time. All usable products remain stored and can be reviewed through server pagination (maximum 50 rows per request).
- Products are written with one `createMany` batch rather than one database request per row.
- Embedded images are stored in the private Supabase Storage bucket `catalog-images` and served through an authenticated route.
- Recommendation generation reads the validated `CatalogProduct` records. It no longer reparses and resends the original workbook.
- Import and recommendation work is recorded in `BackgroundJob` with bounded progress and structured failure details.

## Validation behavior

- Item name is the only blocking field.
- English and Hebrew aliases are recognized automatically.
- Unknown headers can be mapped manually and the same local file can be validated again.
- Missing category is inferred where possible and marked as a warning.
- Missing cost or retail price uses `0` and is marked as a warning.
- Repeated SKU or repeated style/color combinations are flagged as possible duplicates.
- Invalid rows are skipped without discarding usable rows.
- UTF-8 Hebrew CSV and decimal-comma prices are covered by unit tests.

## Supabase configuration

No new secret is required beyond the existing server configuration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)

The private `catalog-images` bucket was created during milestone verification.

## Runtime AI boundary

Milestone 2 does not activate a new external AI API. Trend research and Voyage embeddings remain dormant when their keys are absent. The next recommendation milestone will version and cache trend evidence, wire the selection-weight model into generation, and represent missing trend evidence as unavailable rather than as a zero score.

## Verification

```bash
npm run lint
npm run typecheck
npm run test:unit
npx prisma validate
npm run build
```

Browser acceptance uses `/buy-plans/new` with `public/sample-catalog.csv`, then verifies `/catalogs` and the generated buy-plan workspace.

## Image delivery

- Embedded catalog images are resized to a maximum of 360×480 and stored as WebP thumbnails.
- Authenticated catalog APIs return short-lived signed Storage URLs, so the browser downloads private thumbnails directly.
- `npm run catalog:optimize-images` safely creates thumbnails for legacy imports and keeps their original files intact.
