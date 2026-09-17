# Cartographie actuelle de la migration `server` → `server-nestjs`

> **Registre exhaustif :** issue [#1889](https://github.com/cloud-pi-native/console/issues/1889).

Cette cartographie décrit l'état structurel constaté dans `origin/main` à
`a3568efb` (2026-09-14). Le décompte est limité aux 75 routes V1 inscrites dans
`apps/server/src/resources/index.ts` et leurs contrats partagés.

## Règles de classification

| État | Preuve requise |
| --- | --- |
| Routé vers NestJS | Contrôleur NestJS chargé, règle Nginx V1 vers NestJS, aucun blocage structurel connu. |
| Routé, conditionnel à confirmer | Même preuve de routage, mais le module dépend d'une variable `USE_*` non versionnée. |
| Bloqué par parité d'événements | Route routée, mais un événement NestJS requis n'a aucun consommateur équivalent. |
| Enregistré, non routé | Contrôleur et module chargés, fallback Nginx vers le legacy. |
| Porté, non enregistré | Contrôleur présent, module absent du chemin de chargement. |
| Legacy seul | Aucun contrôleur NestJS V1 équivalent. |

## Carte V1 par état

| État | Modules | Routes |
| --- | --- | ---: |
| Routé vers NestJS | project, project-bulk, project-hooks, project-secrets, project-roles, project-services | 16 |
| Bloqué par parité d'événements | project-members | 4 |
| Routé, conditionnel à confirmer | service-chain | 5 |
| Enregistré, non routé | version, healthz, system-config, system-settings, log | 7 |
| Porté, non enregistré | admin-role | 5 |
| Legacy seul | admin-token, cluster, environment V1, repository V1, service-monitor, stage, user, user-token, zone | 38 |
| **Total** | | **75** |

`location ^~ /api/v1/projects` et `location /api/v1/projects-bulk` couvrent les
routes project routées. `location /api/v1/service-chains` couvre ServiceChain,
mais `PluginModule` n'enregistre son module que lorsque
`USE_SERVICE_CHAIN=true`.

## APIs hors décompte V1

| Catégorie | Modules | Routes | Routage |
| --- | --- | ---: | --- |
| Remplacement V2 | environment, repository | 9 | `location /api/v2/` |
| NestJS-only | deployment | 4 | expression dédiée sous `/api/v1/projects/:projectId/deployments` |

Les APIs V2 ne remplacent pas automatiquement les contrats V1
`/api/v1/environments` et `/api/v1/repositories`. Ces deux modules restent dans
le backlog V1.

## Dépendances de bascule

| Événement | Émetteur NestJS | Consommateur NestJS | État |
| --- | --- | --- | --- |
| `project.upsert`, `project.delete` | `AppEventsService` | Vault, Keycloak, GitLab, Harbor, Nexus, ArgoCD, SonarQube, Observability selon `USE_*` | Consommateurs présents ; activation conditionnelle sauf Keycloak. |
| `zone.upsert`, `zone.delete` | Aucun émetteur migré | Vault | La zone reste legacy. |
| `repository.sync` | `RepositoryService` V2 | GitLab | Consommateur présent ; API V2 hors décompte. |
| `projectMember.upsert`, `projectMember.delete` | `ProjectMembersService` | Aucun | Blocage. |
| `adminRole.upsert`, `adminRole.delete` | `AdminRoleService` | Aucun | Blocage ; module non enregistré. |

Les événements `projectMember.*` et `adminRole.*` sont des bloqueurs : chaque
émission doit avoir un consommateur `@OnEvent` qui encapsule son résultat avec
`capturePluginResult`. Sans cela, les synchronisations Keycloak ou GitLab
peuvent s'interrompre silencieusement.

## Ordre de migration

1. Enregistrer `AdminRoleModule` et créer les consommateurs de
   `adminRole.upsert` et `adminRole.delete` avant toute bascule de ses cinq
   routes.
2. Créer les consommateurs `projectMember.upsert` et
   `projectMember.delete`, avec résultats capturés, puis revalider les quatre
   routes project-members routées.
3. Pour chaque module legacy seul, migrer une tranche verticale complète :
   contrat V1, contrôleur NestJS, module chargé, parité d'événements, tests
   ciblés et règle Nginx.
4. Ne retirer une route V1 qu'après la décision explicite de remplacer ou
   rediriger son contrat par une API V2.

## Sources de preuve

- `apps/server/src/resources/index.ts`
- `packages/shared/src/contracts/`
- `apps/server-nestjs/src/main.module.ts`
- `apps/server-nestjs/src/modules/plugin/plugin.module.ts`
- `apps/server-nestjs/src/modules/events/app-events.service.ts`
- `apps/nginx-strangler/conf.d/routing.conf`
