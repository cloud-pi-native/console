# Backend

Read when changing NestJS services, API contracts or auth, or comparing legacy behavior.

## NestJS target

`apps/server-nestjs` is the only modifiable backend target. Treat `apps/server` as read-only reference, not as an authoring template to extend.

Services receive configuration through injection:
`@Inject(xxxConfigFactory.KEY)` with `ConfigType<typeof xxxConfigFactory>`;
never read `process.env` in services.

API contracts live in `@cpn-console/shared` and are shared with the client via @ts-rest.
Permissions use BigInt bitmasks (`ProjectAuthorized`, `AdminAuthorized`).

## Legacy Fastify reference

Resources live in `apps/server/src/resources/` and follow a three-file pattern:

- `router.ts`: authentication, permissions and delegation to business logic.
- `business.ts`: business logic, query orchestration and hook calls.
- `queries.ts`: Prisma queries.

Legacy authentication uses Keycloak and Fastify sessions.

For hook/event migration requirements, read [Plugins and hooks](plugins.md).
