# Database

Read when changing Prisma queries, schemas or migrations.

- Prisma schema files live in `apps/backend/src/prisma/schema/`. Make backend changes in `apps/backend`; consult Git history for the removed legacy schema.
- Migrations use Prisma Migrate. Major-version data migrations live in `migrations/v9/`.
- `deleteMany`/`updateMany` with an `undefined` filter value can match all rows. Always filter by a concrete id.
- `ProjectRole`/`Repository` foreign keys do not cascade.
