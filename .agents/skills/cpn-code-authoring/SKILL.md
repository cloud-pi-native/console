---
name: cpn-code-authoring
description:
  "Use when writing or reviewing domain code in cloud-pi-native/console:
  naming consensus, layer discipline, fixture and test conventions ratified
  by the 2026-10 strangler-fig PR fleet."
version: 1.0.0
license: Apache-2.0
---

# Console code authoring

Conventions surveyed across the 21-PR strangler-fig fleet (2026-10-02) and
ratified in review. Generic authoring rules live in the personal catalog
(`sks-code-authoring`); only console-specific decisions are here.

## Naming consensus

- Services return raw Prisma records; types come from `<module>-queries.utils.ts`
  selects. Controllers map to contract shapes via `to<Thing>` mappers in
  `<module>.utils.ts`.
- Where-builders are named `generate<Domain><PrismaType>`.
- Defaults belong in zod `.default()`, never as service arguments.
- `makeXxx` factories only in test lifecycle, never imported by prod code.
- Fixtures must match the exact selected-payload shape; `adminTokenSelect`
  excludes `hash`, hence `makeListedToken` /
  `ListedAdminToken = Omit<AdminTokenRecord, 'hash'>`.
- `auth-testing.utils.ts` `makeAdminToken` keeps custom overrides: its owner
  shape `{ id, adminRoleIds, type }` is not `AdminTokenRecord['owner']`.

## Testing details

- Deterministic tests: a faker draw must never be able to cross a branch
  threshold (pin the draw window), otherwise CI flakes.
- Always prefer `mockDeep` for mocks (type safety over plain `vi.fn()` or
  hand-rolled doubles); no describe-scope calls.

## Review conventions

- Findings are French inline comments tagged
  `[🔴 Bloquant][🟠 Important][🟡 Nit][⚪ Suggestion][✨ Éloge]`.
