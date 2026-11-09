# Database

Read when changing Prisma queries, schemas or migrations.

- Legacy multi-file schema reference: `apps/server/src/prisma/schema/*.prisma` (project, user, token, admin, topography). The legacy backend remains frozen; make backend changes in `apps/server-nestjs`.
- Migrations use Prisma Migrate. Major-version data migrations live in `migrations/v9/`.
- `deleteMany`/`updateMany` with an `undefined` filter value can match all rows. Always filter by a concrete id.
- `ProjectRole`/`Repository` foreign keys do not cascade.
