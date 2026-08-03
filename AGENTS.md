<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## MODO engineering rules

- Preserve existing routes, authentication behavior, Prisma relations, and commercial recommendation behavior unless the active milestone explicitly changes them.
- Keep UI components focused on presentation and interaction. Put parsing, validation, storage, persistence, and recommendation logic in dedicated server-side modules.
- Parse supplier files and process images on the server only. Never send an entire workbook or an unbounded product collection back to the browser.
- Use bounded pagination for data previews and tables. Keep initial responses small and load additional rows on demand.
- Prefer batched database reads and writes, indexed filters, and category-level work over per-row network or database calls. Avoid N+1 query patterns.
- Keep service-role credentials and external API keys server-only. Never expose them through `NEXT_PUBLIC_`, response payloads, logs, or committed files.
- Missing external AI evidence must be omitted and explained; it must never be replaced with an invented score.
- Reuse the project design tokens and primitives, maintain keyboard/focus behavior, and respect reduced-motion preferences.
- At the end of each milestone run lint, TypeScript, unit tests, Prisma validation when relevant, production build, and a local runtime smoke test. Stop for product-owner browser review before starting the next milestone.
