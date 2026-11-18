# Database

Read when changing Prisma queries, schemas or migrations.

- Prisma schema files live in `apps/server-nestjs/src/prisma/schema/`. Make backend changes in `apps/server-nestjs`; consult Git history for the removed legacy schema.
- Database migrations use Prisma Migrate and live in `apps/server-nestjs/src/prisma/migrations/`. The retired v8-to-v9 migration procedure is available in Git history.
- `deleteMany`/`updateMany` with an `undefined` filter value can match all rows. Always filter by a concrete id.
- `ProjectRole`/`Repository` foreign keys do not cascade.
