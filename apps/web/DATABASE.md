# Database & Prisma — how to make schema changes safely

## TL;DR
- To change the schema: edit `prisma/schema.prisma`, then run **`npx prisma db push`**.
- `db push` is additive and safe for this project. It never resets data for
  additive changes (new tables / nullable columns / columns with defaults).
- If `db push` ever warns about **data loss** (removing or retyping a column),
  stop and read it — don't blindly accept.

## History (why this doc exists)
This database was built with `prisma db push`, not migration files. That left
the migration history out of sync with the real database ("drift"). On a drifted
database, `prisma migrate dev` refuses to add columns and instead insists on
**wiping and rebuilding the whole database** — which nearly destroyed all data
twice (Neon's connection dropping mid-reset was the only thing that saved it).

On 2026-07-12 the history was **baselined**: the 21 stale migrations were moved
to `prisma/_migrations_archive_2026-07/`, and a single `00000000000000_baseline`
migration was recorded to represent the current database exactly. `prisma migrate
status` now reports "up to date" with no drift.

## Which command to use
- **`npx prisma db push`** — the normal way to apply schema changes here. Fast,
  additive, no migration files to manage.
- `npx prisma migrate dev` — now *safe* (baseline removed the drift), but only
  use it if you deliberately want versioned migration files. If it ever prompts
  to "reset" / "all data will be lost" again, that means new drift crept in —
  **answer no** and investigate, don't accept.
- `npx prisma migrate status` — read-only; run this if unsure. It should say
  "Database schema is up to date!".

## After any schema change
1. `npx prisma db push`
2. Restart the dev server so it loads the regenerated Prisma client:
   `Ctrl-C` then `npm run dev`.
