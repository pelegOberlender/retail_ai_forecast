# Milestone 1 — Foundation

## Product decisions

- Default trend and recommendation market: Israel (`IL`), confirmed by the product owner.
- UI direction: graphite, porcelain, mineral blue, Manrope, editorial but operational.
- Missing API evidence is omitted. It is never replaced with a random or deterministic pseudo-score.

## Foundation delivered

- PostgreSQL/Supabase-ready Prisma schema for catalog imports, products, product analysis, trend reports, recommendation configuration, buy plans, and background jobs.
- Baseline PostgreSQL migration in `prisma/migrations/20260803170000_foundation`.
- Explicit job lifecycle with bounded progress, structured errors, and retry limits.
- Selection-score configuration with default weights `35/25/15/15/10` and re-normalization when evidence is unavailable.
- Desktop App Shell with five primary sections, a compact context bar, Israel-market indicator, and mobile navigation.
- Foundation pages for Catalogs and Settings.
- Production build no longer fails when Supabase is absent during static generation. Production requests still fail closed until authentication is configured.

## Local database transition

The existing `prisma/dev.db` SQLite file is preserved and is not committed. The new target schema is PostgreSQL. The migration is intentionally not applied until a real Supabase/PostgreSQL `DATABASE_URL` is configured. This avoids destructive or partial data conversion.

## Acceptance workbook baseline

- File: `טמפלייט קניות(AutoRecovered).xlsx`
- Workbook opens successfully.
- Detected sheets: one (`גיליון1`).
- Full parsing, Rich Data image extraction, validation, and duplicate detection belong to Milestone 2.

## Secrets required before external services are connected

Create `.env.local` in the project root. This file is ignored by Git. Do not paste any secret into chat or commit it.

| Variable | Required for | Where to obtain it | Exposure |
| --- | --- | --- | --- |
| `DATABASE_URL` | Runtime PostgreSQL data | Supabase → Connect → ORM → Prisma → transaction pooler URI. | Server only |
| `DIRECT_URL` | Prisma migrations | Supabase → Connect → ORM → Prisma → session/direct URI. | Server only |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase browser/server client | Supabase → Project Settings → API → Project URL | Public by design |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Authentication from the browser | Supabase → Project Settings → API → anon/publishable key | Public by design |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side storage/admin work in later milestones | Supabase → Project Settings → API → service role key | Server only; never prefix with `NEXT_PUBLIC_` |
| `ANTHROPIC_API_KEY` | Live sourced trend research in Milestone 4 | Anthropic Console → API Keys | Server only |
| `VOYAGE_API_KEY` | Product/history embeddings in Milestone 3 | Voyage AI dashboard → API Keys | Server only |

The first four values are needed to switch the app to Supabase. The AI keys are not needed for Milestone 1 and remain disconnected.

## Verification commands

```bash
npm run lint
npm run typecheck
npm run test:unit
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/modo" npx prisma validate
npm run build
```
