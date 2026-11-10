# Migration parity (strangler-fig)

Referenced from `SKILL.md`. Rules apply when comparing `apps/server-nestjs`
with the removed Fastify `apps/server`, available in Git history only.
- Every `eventEmitter.emitAsync('<entity>.<verb>')` needs a matching
  `@OnEvent` consumer bridging to `capturePluginResult`; the Fastify->Nest
  break is silent — group syncs stop at cutover without it.
- `@ts-rest` contracts in `packages/shared` must stay in sync: changing one
  side without the other compiles fine and breaks at runtime.
- BigInt permission bitmasks (`ProjectAuthorized`/`AdminAuthorized`) are
  never downcast to number.
- `crypto.ts` unsalted sha256 token hash is intentional (cross-server
  compatibility): do not "fix" it, including for CodeQL.
