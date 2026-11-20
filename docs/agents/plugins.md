# Integration events and configuration

- Integrations live in `apps/backend/src/modules/integrations/` and are enabled through NestJS modules.
- `core/plugin` owns service metadata, URL parameters and configuration helpers. `PluginService.manifests()` lists enabled integrations without resolving a project; `infos(projectId)` resolves project-specific links.
- Project and system configuration use the same manifests and permission-aware validators. No global legacy registration is required.
- The legacy hook engine and plugin loader are removed. Consult Git history for their implementation.

## NestJS events

Every `eventEmitter.emitAsync('<entity>.<verb>')` must have a matching
`@OnEvent` consumer bridging to `capturePluginResult`; otherwise Keycloak/GitLab
group synchronization silently stops at cutover.
