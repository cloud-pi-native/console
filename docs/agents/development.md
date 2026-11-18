# Development and environment

Read when setting up the workspace, configuring environments or starting Docker stacks.

## Environment files

- `.env`, `.env.docker` and `.env.integ` templates live in `apps/client/` and `apps/server-nestjs/`.
- Templates use the `*-example` suffix, not `.example`; templates are Git-tracked and active files are ignored.
- NestJS uses `apps/server-nestjs/src/utils/dotenv.utils.ts` through `ConfigModule`: `.env` is selected unless `DOCKER=true`, `.env.integ` when `INTEGRATION=true`, then `.env.docker` when `DOCKER=true`. NestJS gives the first selected file precedence; explicit environment variables take precedence over files.
- Client loader: `apps/client/vite.config.ts` loads `.env.integ` first when `INTEGRATION=true`, then `.env` unless `DOCKER=true`, using `process.loadEnvFile` without overriding existing environment variables. Docker-provided variables are configured by the Compose files.
- `bash ci/scripts/init-env.sh` copies templates to active files without overwriting existing files. Run it if required `.env` files are missing.
- The legacy server and its environment loader are removed; use Git history for comparisons.
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
