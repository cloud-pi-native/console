# Backend

Read when changing NestJS services, API contracts or auth, or comparing legacy behavior.

## NestJS target

`apps/server-nestjs` is the only backend target. The legacy server is removed; use Git history for behavior comparisons, not as an authoring template to extend.

Services receive configuration through injection:
`@Inject(xxxConfigFactory.KEY)` with `ConfigType<typeof xxxConfigFactory>`;
never read `process.env` in services.

API contracts live in `@cpn-console/shared` and are shared with the client via @ts-rest.
Permissions use BigInt bitmasks (`ProjectAuthorized`, `AdminAuthorized`).

## Integration events

Integrations live in `apps/server-nestjs/src/modules/integrations/`. The legacy hook engine and plugin loader are removed.

For NestJS event requirements and integration configuration, read [Integration events and configuration](plugins.md).
