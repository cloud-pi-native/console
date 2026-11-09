# Development and environment

Read when setting up the workspace, configuring environments or starting Docker stacks.

## Environment files

- `.env`, `.env.docker` and `.env.integ` live in `apps/client/`, `apps/server/` and `apps/server-nestjs/`.
- Templates use the `*-example` suffix, not `.example`; templates are Git-tracked and active files are ignored.
- Override order, weakest to strongest: `.env` < `.env.docker` (if `DOCKER=true`) < `.env.integ` (if `INTEGRATION=true`) < explicit environment variables.
- Legacy server loader: `apps/server/src/utils/env.ts` (read-only reference). Client loader: `apps/client/vite.config.ts`.
- `bash ci/scripts/init-env.sh` copies templates to active files without overwriting existing files. Run it if required `.env` files are missing.
- The frozen `apps/server` boundary also applies to its environment files; do not redesign legacy configuration.
- For NestJS service configuration injection, read [Backend](backend.md).

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start local Docker infrastructure (Keycloak, PostgreSQL, pgAdmin) and print application-start commands; application processes must be started separately. |
| `pnpm docker:dev` | Start the fully containerized development stack, configured with Compose Watch. |
| `pnpm docker:integ` / `pnpm integ` | Integration mode using a remote environment. |
| `pnpm fullsetup` | Install dependencies, generate Prisma client, build packages and Docker images. |
| `pnpm fullclean` | Clean builds, node_modules and Docker images. |

For E2E stack setup and cleanup, read [Testing and quality gates](testing.md).
