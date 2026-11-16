# E2E one-spec manual debugging

Occasional procedure, carved from AGENTS.md per progressive disclosure.

- For one-spec manual debugging only, start the CI stack with `pnpm docker:ci`,
  run `pnpm --dir playwright exec playwright test e2e-tests/dashboard.spec.ts -g 'Should display a project statuses'`, then stop it with `pnpm docker:ci:clean`.
