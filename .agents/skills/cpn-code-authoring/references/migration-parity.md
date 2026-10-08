# Migration parity (strangler-fig)

Referenced from `SKILL.md`. Rules apply when porting behaviour between
`apps/server` (legacy Fastify) and `apps/server-nestjs`.

- `apps/server` is frozen: read-only reference, never edited.
- Every `eventEmitter.emitAsync('<entity>.<verb>')` needs a matching
  `@OnEvent` consumer bridging to `capturePluginResult`; the Fastify->Nest
  break is silent — group syncs stop at cutover without it.
- `@ts-rest` contracts in `packages/shared` must stay in sync: changing one
  side without the other compiles fine and breaks at runtime.
- nginx `routing.conf` order matters: specific locations (e.g.
  `/api/v1/stages`) above the `/api/` catch-all; upstreams `server-legacy` /
  `server-nestjs`.
- BigInt permission bitmasks (`ProjectAuthorized`/`AdminAuthorized`) are
  never downcast to number.
- `crypto.ts` unsalted sha256 token hash is intentional (cross-server
  compatibility): do not "fix" it, including for CodeQL.
