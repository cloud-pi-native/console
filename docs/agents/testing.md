# Testing and quality gates

Read before verifying any change. Select checks by the changed surface.

## Markdown-only changes

Use targeted Markdown, local-link and source-assertion checks, plus
`git diff --check`. Do not run pnpm commands, application tests, E2E stacks
or test hooks unless the user explicitly requests them.

## Application changes

Before reporting completion, run these in order:

1. `pnpm format`
2. `pnpm lint`
3. Targeted Vitest specs for the affected behavior; `pnpm test` runs all unit tests.

Vitest tests are colocated `*.spec.ts` files across the server, client,
packages and plugins.

Tooling conventions:

- ESLint 9 flat configuration based on `@antfu/eslint-config`.
- No Prettier except in `server-nestjs`.
- Stylelint for client CSS/Vue.

## Playwright E2E

The suite lives in `playwright/`, runs Chromium and Firefox in parallel,
and requires the CI stack and its fixtures. `docker:dev` does not provide
E2E fixtures.

If required `.env` files are missing, run `bash ci/scripts/init-env.sh`.
Stop any active development stack with `pnpm docker:dev:clean` before E2E.

Use `pnpm docker:e2e-ci`, the only Docker E2E runner, to start the CI stack
and run the full suite. Clean up with `pnpm docker:e2e-ci:delete` after the
suite, including failed runs.

For one-spec manual debugging only:

1. Start the CI stack: `pnpm docker:ci`.
2. Run `pnpm --dir playwright exec playwright test e2e-tests/dashboard.spec.ts -g 'Should display a project statuses'`.
3. Stop the stack: `pnpm docker:ci:clean`.
