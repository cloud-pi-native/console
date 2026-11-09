# Plugins and hooks

Read when changing plugins, hook orchestration or NestJS event bridges.

- Lifecycle: `pre` → `main` → `post`; steps run sequentially and plugins run in parallel within a step. On failure: `revert`.
- Legacy plugin loading: static imports in `apps/server/src/plugins.ts`, followed by dynamic loading of external plugins from `/plugins`. This is read-only reference behavior.
- Each plugin contains `index.ts` (Plugin interface), `infos.ts` (metadata/config) and `functions.ts` (hook handlers).
- Plugins use TypeScript module augmentation to extend `ProjectStore` and `Config` interfaces.

## NestJS parity

Every `eventEmitter.emitAsync('<entity>.<verb>')` must have a matching
`@OnEvent` consumer bridging to `capturePluginResult`; otherwise Keycloak/GitLab
group synchronization silently stops at cutover.
