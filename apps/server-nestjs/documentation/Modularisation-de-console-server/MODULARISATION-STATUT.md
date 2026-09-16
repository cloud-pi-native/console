# État de la modularisation Backend → NestJS

> **Source de vérité route par route :** issue [#1889](https://github.com/cloud-pi-native/console/issues/1889).
>
> **Preuves auditées :** `origin/main` à `a3568efb` (2026-09-14), contrats V1,
> modules NestJS et `apps/nginx-strangler/conf.d/routing.conf`.

## Périmètre et lecture

Le décompte couvre les **75 routes V1** encore enregistrées dans
`apps/server/src/resources/index.ts`.

« Routé » signifie que la configuration Nginx versionnée envoie la requête vers
NestJS. Cela ne prouve pas le trafic observé en production. Une route V2 ou une
route créée directement dans NestJS ne solde pas sa route V1 tant que celle-ci
reste servie par `apps/server`.

## Décompte V1

| État | Routes |
| --- | ---: |
| Routé vers NestJS | 16 |
| Routé, conditionnel à confirmer (`USE_SERVICE_CHAIN=true`) | 5 |
| Bloqué par parité d'événements | 4 |
| Enregistré, non routé | 7 |
| Porté, non enregistré | 5 |
| Legacy seul | 38 |
| **Total** | **75** |

Les 16 routes routées sans blocage structurel couvrent `project`,
`project-bulk`, `project-hooks`, `project-secrets`, `project-roles` et
`project-services`. Les quatre routes `project-members` sont bien routées mais
restent bloquées par l'absence de consommateur d'événements.

## Alertes bloquantes

- `projectMember.upsert` et `projectMember.delete` sont émis par
  `ProjectMembersService`, sans consommateur `@OnEvent` ; les quatre routes
  membres ne doivent pas être considérées comme fonctionnellement migrées.
- `adminRole.upsert` et `adminRole.delete` sont émis sans consommateur et sans
  retour via `capturePluginResult`. `AdminRoleModule` est en outre importé mais
  absent du tableau `imports` de `MainModule`.
- ServiceChain est dirigé vers NestJS, mais son module est enregistré seulement
  lorsque `USE_SERVICE_CHAIN=true`. Cette valeur active n'est pas versionnée.

## Hors décompte V1

- **Remplacements V2 (9 routes)** : environment (4) et repository (5), sous
  `/api/v2/projects/:projectId/...`, sont chargés dans NestJS et routés par
  `location /api/v2/`.
- **NestJS-only (4 routes)** : deployment est chargé dans NestJS et routé sous
  `/api/v1/projects/:projectId/deployments`.

Ces routes ne retirent pas les routes V1 `/api/v1/environments` et
`/api/v1/repositories` du legacy.

## Suite

Consulter #1889 pour les 75 lignes, leurs états et leurs preuves. Toute
bascule doit établir la présence du contrôleur, l'enregistrement du module, la
règle Nginx et, lorsqu'un événement est émis, son consommateur qui retourne un
résultat capturé.
