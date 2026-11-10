# Console Cloud Pi Native

Cloud Pi Native Console is a pnpm monorepo with a Vue client, a NestJS backend migration, and infrastructure-service plugins.

- Toolchain: Node.js 26.x and pnpm 11.8.0 (`package.json`).
- Build: `pnpm build` (recursive workspace builds).
- Client typecheck: `pnpm --filter @cpn-console/client type-check`; `pnpm lint:ts` runs ESLint, not the TypeScript compiler.
- `apps/server` is frozen, read-only reference code; `apps/server-nestjs` is the only modifiable backend target.

## Task-specific instructions

Read the relevant guides before working on their topics; unrelated guides need not be loaded.

| When working on… | Read |
| --- | --- |
| Workspace navigation or locating an implementation | [Project structure](docs/agents/project-structure.md) |
| Backend services, API contracts, auth or legacy behavior | [Backend](docs/agents/backend.md) |
| Plugin hooks or NestJS event parity | [Plugins and hooks](docs/agents/plugins.md) |
| Prisma queries, schemas or migrations | [Database](docs/agents/database.md) |
| Local setup, environment files or Docker commands | [Development](docs/agents/development.md) |
| TypeScript code or compiler configuration | [TypeScript](docs/agents/typescript.md) |
| Verification of any change, including Markdown-only changes | [Testing and quality gates](docs/agents/testing.md) |
| Commits, branches, pull requests or releases | [Git and release workflow](docs/agents/git-and-release.md) |
