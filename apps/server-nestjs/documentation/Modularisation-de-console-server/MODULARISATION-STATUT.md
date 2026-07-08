# État de la modularisation Backend → NestJS

> 📋 **Ce fichier est mis à jour en temps réel**
> Dernière mise à jour : **2026-07-16** (reconciliation avec l'état du code : routage nginx + modules absents)

---

## 🎯 Progression globale

![Progress](https://progress-bar.dev/17/?title=modularisation&width=400)

**~17%** routé (2 modules métier servis par server-nestjs sur le trafic réel : `service-chains`, `projects` ; `environment` via /api/v2/), **13 modules métier exposés** (controller actif, non routés), **8 plugins encapsulés** (non routés).

> **Détail du comptage** : le Strangler Fig n'est réellement actif que pour les
> routes basculées dans `apps/nginx-strangler/conf.d/routing.conf`. À ce jour seuls
> `service-chains`, `projects` (depuis `location /api/v1/projects`) et `environment`
> (via `location /api/v2/`) y sont routés. Les autres modules déclarés dans
> `main.module.ts` tournent en parallèle mais restent servis par le legacy via le
> fallback `location /api/`.

---

## 📊 Vue d'ensemble

| Statut | Nombre de modules | % du total |
|--------|-------------------|------------|
| ✅ Exposé (controller déclaré dans `main.module.ts`) | 13 (modules métier) | ~46% |
| ⚠️ Encapsulé (plugin, sans route) | 8 (vault, keycloak, gitlab, harbor, nexus, argocd, sonarqube, opencds) | ~29% |
| 📅 Planifié | 10 (modules métier restants) | ~36% |
| ⏳ En attente de cartographie | 0 | 0% |

> Note : un même module peut être à la fois "exposé" et "non routé". Le % est
> calculé sur les 28 entrées de la cartographie (18 modules métier + 10 plugins).

---

## ✅ Modules migrés

### ServiceChain (OpenCDS) — migré le 2026-04-09

Module proxy HTTP vers l'API externe OpenCDS (gestion des chaînes de service
réseau). Migré en avance de phase par rapport au planning initial (prévu V3/S8),
profitant de son isolement complet vis-à-vis du reste du codebase.

- **Routes** : 5 (`/api/v1/service-chains/...`)
- **Auth** : `AuthService` unifie `x-dso-token` et bearer JWT Keycloak
- **Nginx** : Bascule effectuée dans `nginx-strangler/conf.d/routing.conf`
- **Tests** : Controller + Service couverts (Vitest)
- **Différences avec le legacy** :
  - 403 systématique si permissions insuffisantes (le legacy renvoyait `[]` sur GET /)
  - Validation UUID sur les paramètres d'URL (400 si format invalide)

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/service-chains` | `ListSystem` |
| `GET` | `/api/v1/service-chains/:id` | `ListSystem` |
| `GET` | `/api/v1/service-chains/:id/flows` | `ListSystem` |
| `POST` | `/api/v1/service-chains/:id/retry` | `ManageSystem` |
| `POST` | `/api/v1/service-chains/validate/:id` | `ManageSystem` |

### Project — migré le 2026-05-28

#### Project

Module cœur de gestion des projets (CRUD, export CSV).

- **Routes** : 6 (`/api/v1/projects/...`)
- **Auth** : Token (`x-dso-token`) + guards projet (`ProjectGuard`, `ProjectStatusGuard`, `ProjectLockedGuard`)
- **Validation** : Contrats Zod via `projectContract` de `@cpn-console/shared` avec `ZodValidationPipe`
- **Tests** : Controller + Service couverts (Vitest)

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/projects/data` | `Manage` (admin) |
| `GET` | `/api/v1/projects` | Authentifié |
| `POST` | `/api/v1/projects` | `ManageProjects` (admin) + type `human` |
| `GET` | `/api/v1/projects/:projectId` | Authentifié + projet |
| `PUT` | `/api/v1/projects/:projectId` | Authentifié + projet (statut ≠ archived) |
| `DELETE` | `/api/v1/projects/:projectId` | `ManageProjects` (admin) |

**Infrastructure créées/mise à jour** :
- `ProjectGuard` + `Project` decorator : chargement du projet par id/slug, résolution des permissions via bitmask
- `ProjectStatusGuard` + `@RequireProjectStatus()` : filtrage par statut du projet
- `ProjectLockedGuard` + `@RequireProjectLocked()` : protection contre les modifications de projets verrouillés
- `UserGuard` + `@AuthUser()` decorator : authentification token + injection du contexte utilisateur

**Différences avec le legacy** :
- Utilisation de `projectContract` de `@cpn-console/shared` pour les schemas de validation (cohérence client/serveur)
- ZodValidationPipe au lieu de la validation ts-rest implicite
- Sous-modules `secrets`, `services`, `hooks`, `bulk`, `roles`, `members` sont des modules NestJS séparés (pas fusionnés dans un `project-core`)

#### ProjectBulk

Module d'actions en masse sur les projets (archivage, verrouillage, rejeu hooks).

- **Routes** : 1 (`/api/v1/projects-bulk`)
- **Auth** : `UserGuard` + `@RequireAdminPermission('Manage')`
- **Validation** : Contrat Zod via `projectContract.bulkActionProject`
- **Tests** : Service couvert (Vitest)

| Méthode | Route | Permission |
|---------|-------|------------|
| `POST` | `/api/v1/projects-bulk` | `Manage` (admin) |

**Fichiers** :
- `src/modules/project-bulk/project-bulk.controller.ts`
- `src/modules/project-bulk/project-bulk.service.ts`
- `src/modules/project-bulk/project-bulk.module.ts`

**Actions supportées** :
- `archive` — Archivage de projets (exclut les déjà archivés)
- `lock` / `unlock` — Verrouillage/déverrouillage de projets
- `replay` — Rejeu de la chaîne de hooks d'un projet

**Points d'attention** :
- Le bulk action itère sur les projets avec `Promise.allSettled` (résultat par projet)
- L'export CSV (`GET /api/v1/projects/data`) est géré par le `ProjectController`

### Infrastructure transverse déployée

En support de ces migrations, les éléments d'infrastructure suivants ont été
créés :

- **AuthModule** (`infrastructure/auth/`) : `AuthService` (validation token
  SHA256 via Prisma + bearer JWT Keycloak), `DsoTokenModule`,
  `KeycloakJwtModule` et décorateur `@AuthUser()`
- **PermissionModule** (`infrastructure/permission/`) : `UserModule`
  (`UserGuard`, `UserService`, `UserPolicy`) + `ProjectModule`
  (`ProjectGuard`, `ProjectLoaderService`, `ProjectService`, `ProjectPolicy`)
- **Nginx strangler** : Reverse proxy configuré pour router les routes migrées
  vers server-nestjs, le reste vers le legacy
- **Docker** : Build order corrigé (shared avant server-nestjs)

> **Limitation connue** : l'auth par session Keycloak et le flux bearer JWT ont
> désormais la même entrée publique (`AuthService.authenticate(request, ...)`),
> mais les usages côté contrôleurs restent encore à homogénéiser au fil des
> modules migrés.

#### ProjectMember

Module de gestion des membres projet (ajout, modification, suppression, liste).
Dédié aux routes `/api/v1/projects/:projectId/members/...`.

- **Routes** : 4 (`/api/v1/projects/:projectId/members/...`)
- **Auth** : Token (`x-dso-token`) + guards projet (`ProjectGuard`, `ProjectStatusGuard`, `ProjectLockedGuard`)
- **Validation** : Contrats Zod via `projectMemberContract` de `@cpn-console/shared`

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/projects/:projectId/members` | `ListMembers` (admin) |
| `POST` | `/api/v1/projects/:projectId/members` | `ManageMembers` (admin) + statut non archivé |
| `PATCH` | `/api/v1/projects/:projectId/members` | `ManageMembers` (admin) + statut non archivé |
| `DELETE` | `/api/v1/projects/:projectId/members/:userId` | `ManageMembers` (admin) ou auto-suppression + statut non archivé |

**Fichiers** :
- `src/modules/project-members/project-members.controller.ts`
- `src/modules/project-members/project-members.service.ts`
- `src/modules/project-members/project-members.module.ts`

**Différences avec le legacy** :
- Recherche par email non disponible (nécessite le hook Keycloak `user.retrieveUserByEmail`, non migré)
- Retour de la liste complète des membres après chaque mutation (cohérence avec le legacy)

#### ProjectRoles

Module de gestion des rôles projet (création, modification, suppression, liste, comptage).
Dédié aux routes `/api/v1/projects/:projectId/roles/...`.

- **Routes** : 5 (`/api/v1/projects/:projectId/roles/...`)
- **Auth** : Token (`x-dso-token`) + guards projet (`ProjectGuard`, `ProjectStatusGuard`, `ProjectLockedGuard`)
- **Validation** : Contrats Zod via `projectRoleContract` de `@cpn-console/shared`

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/projects/:projectId/roles` | `ListRoles` (admin) |
| `POST` | `/api/v1/projects/:projectId/roles` | `ManageRoles` (admin) + statut non archivé |
| `PATCH` | `/api/v1/projects/:projectId/roles` | `ManageRoles` (admin) + statut non archivé |
| `GET` | `/api/v1/projects/:projectId/roles/member-counts` | `ListRoles` (admin) |
| `DELETE` | `/api/v1/projects/:projectId/roles/:roleId` | `ManageRoles` (admin) + statut non archivé |

**Fichiers** :
- `src/modules/project-roles/project-roles.controller.ts`
- `src/modules/project-roles/project-roles.service.ts`
- `src/modules/project-roles/project-roles.module.ts`

#### ProjectSecrets

Module de gestion des secrets projet (lecture des secrets plugin par projet).
Dédié à la route `/api/v1/projects/:projectId/secrets`.

- **Routes** : 1 (`/api/v1/projects/:projectId/secrets`)
- **Auth** : Token (`x-dso-token`) + guards projet (`ProjectGuard`, `ProjectStatusGuard`)
- **Validation** : Contrat Zod via `projectSecretContract` de `@cpn-console/shared`

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/projects/:projectId/secrets` | `ListSecrets` (admin) + projet (statut ≠ archived) |

**Fichiers** :
- `src/modules/project-secrets/project-secrets.controller.ts`
- `src/modules/project-secrets/project-secrets.service.ts`
- `src/modules/project-secrets/project-secrets.module.ts`

**Points d'attention** :
- Appelle le hook `getProjectSecrets` qui interroge chaque plugin pour ses secrets
- Données sensibles : attention au logging et à la sérialisation

#### ProjectServices

Module de gestion des services projet (configuration des plugins par projet).
Dédié aux routes `/api/v1/projects/:projectId/services/...`.

- **Routes** : 2 (`/api/v1/projects/:projectId/services/...`)
- **Auth** : Token (`x-dso-token`) + guards projet (`ProjectGuard`, `ProjectStatusGuard`, `ProjectLockedGuard`)
- **Validation** : Contrats Zod via `projectServiceContract` de `@cpn-console/shared`

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/projects/:projectId/services` | `ListEnvironments` (admin) |
| `POST` | `/api/v1/projects/:projectId/services` | `ManageEnvironments` (admin) + statut non archivé |

**Fichiers** :
- `src/modules/project-services/project-services.controller.ts`
- `src/modules/project-services/project-services.service.ts`
- `src/modules/project-services/project-services.module.ts`

#### ProjectHooks

Module de gestion des hooks projet (mise à jour de la configuration hooks).
Dédié à la route `/api/v1/projects/:projectId/hooks`.

- **Routes** : 1 (`/api/v1/projects/:projectId/hooks`)
- **Auth** : Token (`x-dso-token`) + guards projet (`ProjectGuard`, `ProjectStatusGuard`, `ProjectLockedGuard`)
- **Validation** : Contrat Zod via `projectHooksContract` de `@cpn-console/shared`

| Méthode | Route | Permission |
|---------|-------|------------|
| `PUT` | `/api/v1/projects/:projectId/hooks` | `ManageHooks` (admin) + statut non archivé |

**Fichiers** :
- `src/modules/project-hooks/project-hooks.controller.ts`
- `src/modules/project-hooks/project-hooks.service.ts`
- `src/modules/project-hooks/project-hooks.module.ts`

#### Deployment

Module de gestion des déploiements projet (CRUD des déploiements).
Dédié aux routes `/api/v1/deployments/...`.

- **Routes** : 4 (`/api/v1/deployments/...`)
- **Auth** : Token (`x-dso-token`) + guards projet
- **Validation** : Contrats Zod via `deploymentContract` de `@cpn-console/shared`

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/deployments` | Authentifié + projet |
| `POST` | `/api/v1/deployments` | `ManageDeployments` (admin) |
| `PUT` | `/api/v1/deployments/:deploymentId` | `ManageDeployments` (admin) |
| `DELETE` | `/api/v1/deployments/:deploymentId` | `ManageDeployments` (admin) |

**Fichiers** :
- `src/modules/deployment/deployment.controller.ts`
- `src/modules/deployment/deployment.service.ts`
- `src/modules/deployment/deployment.module.ts`

#### Log

Module de gestion des logs (lecture des logs projet/environnement).

- **Routes** : 1 (`/api/v1/logs`)
- **Auth** : Token (`x-dso-token`) + guards projet

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/logs` | Authentifié + projet |

**Fichiers** :
- `src/modules/log/log.controller.ts`
- `src/modules/log/log.service.ts`
- `src/modules/log/log.module.ts`

#### Healthz

Module de health check (liveness/readiness).

- **Routes** : 1 (`/api/v1/healthz`)
- **Auth** : Publique

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/healthz` | Publique |

**Fichiers** :
- `src/modules/healthz/healthz.controller.ts`
- `src/modules/healthz/healthz.module.ts`

#### Version

Module de version (retourne la version de l'application).

- **Routes** : 1 (`/api/v1/version`)
- **Auth** : Publique

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/version` | Publique |

**Fichiers** :
- `src/modules/version/version.controller.ts`
- `src/modules/version/version.module.ts`

#### SystemSettings

Module de paramètres système (lecture/écriture de configuration globale).

- **Routes** : 2 (`/api/v1/system/settings/...`)
- **Auth** : Token (`x-dso-token`) + admin

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/system/settings` | Admin |
| `PUT` | `/api/v1/system/settings/:key` | Admin |

**Fichiers** :
- `src/modules/system-settings/system-settings.controller.ts`
- `src/modules/system-settings/system-settings.service.ts`
- `src/modules/system-settings/system-settings.module.ts`


#### AdminToken

Module de gestion des tokens de service admin (création, liste, révocation).
Dédié aux routes `/api/v1/admin/tokens/...`.

- **Routes** : 3 (`/api/v1/admin/tokens/...`)
- **Auth** : Token (`x-dso-token`) + admin (`@RequireAdminPermission`)
- **Validation** : Contrat Zod via `adminTokenContract` de `@cpn-console/shared`

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET`  | `/api/v1/admin/tokens` | `ListAdminToken` (admin) |
| `POST` | `/api/v1/admin/tokens` | `ManageAdminToken` (admin) |
| `DELETE` | `/api/v1/admin/tokens/:tokenId` | `ManageAdminToken` (admin) |

**Fichiers** :
- `src/modules/admin-token/admin-token.controller.ts`
- `src/modules/admin-token/admin-token.service.ts`
- `src/modules/admin-token/admin-token.module.ts`

**Points d'attention** :
- Génération d'un mot de passe aléatoire (affiché une seule fois à la création)
- Création d'un utilisateur bot propriétaire du token
- Révocation = soft-delete (status `revoked`, pas de suppression physique)
- Hash SHA256 du mot de passe stocké en base (pas le plaintext)

#### UserTokens

Module de gestion des tokens d'accès personnels (PAT). Dédié aux routes
`/api/v1/user/tokens/...`.

- **Routes** : 3 (`/api/v1/user/tokens/...`)
- **Auth** : Token (`x-dso-token`) + utilisateur humain (`user.userType === 'human'`)
- **Validation** : Contrat Zod via `personalAccessTokenContract` de `@cpn-console/shared`

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET`  | `/api/v1/user/tokens` | Utilisateur humain authentifié |
| `POST` | `/api/v1/user/tokens` | Utilisateur humain authentifié |
| `DELETE` | `/api/v1/user/tokens/:tokenId` | Utilisateur humain authentifié (scope personnel) |

**Fichiers** :
- `src/modules/user-tokens/user-tokens.controller.ts`
- `src/modules/user-tokens/user-tokens.service.ts`
- `src/modules/user-tokens/user-tokens.module.ts`

**Points d'attention** :
- Mot de passe généré aléatoirement, affiché une seule fois à la création
- Hash SHA256 stocké en base (jamais le plaintext)
- Suppression physique (hard delete) contrairement à admin-token
- Scope strict : l'utilisateur ne peut gérer que ses propres tokens

---

## 🌐 État du routage nginx (Strangler Fig)

> Source de vérité : `apps/nginx-strangler/conf.d/routing.conf`.

| Route basculée | Module concerné | État |
|----------------|-----------------|------|
| `location /api/v1/service-chains` | ServiceChain | ✅ Routé (depuis 2026-04-09) |
| `location /api/v1/projects` | Project + sous-modules (members, roles, secrets, services, hooks, bulk) | ✅ Routé (depuis 2026-07-15) |
| `location /api/v2/` | Environment | ✅ Routé |
| `location /api/v1/` (fallback) | Tout le reste | ⚠️ Legacy (`server`) |

**Conséquence** : un module peut avoir son controller NestJS actif (déclaré dans
`main.module.ts`) sans être réellement sollicité en prod — tant que sa route n'est
pas ajoutée à `routing.conf`, c'est le legacy qui répond. La bascule par route est
la seule métrique de "migration effective" fiable.

### Modules exposés mais non routés (controller actif, trafic legacy)

- `system-settings`, `system/version+healthz` (`system` regroupé), `log`
- `deployment`
- `project` + sous-modules `project-members`, `project-roles`, `project-secrets`,
  `project-services`, `project-hooks`, `project-bulk`

### Modules présents en code mais non câblés

- `system-config` : controller `@Controller('api/v1/system/plugins')` présent,
  mais le module n'est **pas** importé dans `main.module.ts`.

### Plugins encapsulés (hook `ServiceInfos`, sans route HTTP)

- `vault`, `keycloak`, `gitlab`, `harbor`, `nexus`, `argocd`, `sonarqube`, `opencds`
- Seul `keycloak` est déclaré dans `main.module.ts` ; les autres sont importés en
  interne par les modules métier qui les consomment (ex. `project-services`
  importe `PluginModule`).

---

## 🚧 En cours de modularisation

### Aucune modularisation en cours

---

## 📅 Modules planifiés

### Modules métier restants (d'après cartographie)

| Module | Routes estimées | Priorité | Notes |
|--------|-----------------|----------|-------|
| `system/config` | 2 | Haute | ⚠️ Code présent (`system-config`), non câblé dans `main.module.ts` |
| `user` | 4 | Haute | Authentification session + utilisateurs |
| `service-monitor` | 3 | Moyenne | Santé services plugins |
| `admin-role` | 5 | Haute | Rôles admin |
| `stage` | 5 | Haute | Prérequis cluster |
| `zone` | 4 | Haute | Hooks vers plugins vault/keycloak/gitlab |
| `cluster` | 7 | Haute | Dépend direct de `stage` |
| `environment` | 4 | Haute | ✅ Routé via `/api/v2/` |
| `repository` | 5 | Moyenne | Sync repo via hook GitLab |
| `project-service` | 2 | Moyenne | ⚠️ Exposé (controller actif), non routé |

**Total estimé** : ~41 routes restantes (hors modules déjà exposés/encapsulés).

### Plugins encapsulés (hook `ServiceInfos`, sans route HTTP)

| Plugin | Hooks souscrits | Statut |
|--------|-----------------|--------|
| `vault` | 7 | ⚠️ Encapsulé, réécriture non commencée |
| `keycloak` | 11 | ⚠️ Encapsulé (déclaré dans `main.module.ts`), réécriture non commencée |
| `gitlab` | 8 | ⚠️ Encapsulé, réécriture non commencée |
| `harbor` | 3 | ⚠️ Encapsulé, réécriture non commencée |
| `nexus` | 3 | ⚠️ Encapsulé, réécriture non commencée |
| `argocd` | 5 | ⚠️ Encapsulé, réécriture non commencée |
| `sonarqube` | 2 | ⚠️ Encapsulé, réécriture non commencée |
| `opencds` | — | ⚠️ Encapsulé (alias service-chain), réécriture non commencée |

> La phase d'**encapsulation** est terminée pour tous les plugins présents
> (modules NestJS existants). La phase de **réécriture métier** (suppression du
> hook system legacy, nettoyage des APIs) reste à planifier.

---

## 🚫 Zones en feature freeze

### Aucune zone gelée actuellement

**Règle** : Quand un module passe en status 🚧 (En cours), il est automatiquement en feature freeze.

**Que faire si vous devez travailler sur une zone gelée ?**
1. Vérifier l'urgence réelle (Critique / Importante / Normale)
2. Consulter le canal #backend-modularisation
3. Coordonner avec le responsable de la modularisation
4. Annoncer sur #backend-modularisation

---

## 📈 Métriques de qualité

### Couverture de tests

| Type | Initial | Actuel | Objectif |
|------|---------|--------|----------|
| E2E Playwright | 33% | 33% | 50% |
| Unitaires Vitest | ? | ? | 70% |
| Tests de contrat | 0% | 0% | 100% |

### Routes par statut

- **Total** : ~75 routes métier ciblées
- **Routées (trafic server-nestjs)** : ~14 (service-chains 5, projects + 6 sous-modules ~8, environment 4 via /api/v2/) — ~17%
- **Exposées (controller actif, trafic legacy)** : ~27 (~36%)
- **Encore en legacy (modules non écrits)** : ~34 (~47%)

---

## 🗓️ Dates clés

| Date | Événement |
|------|-----------|
| 07/01/2026 | Début du projet (S1) |
| 26/01/2026 | Fin de la cartographie (S2) |
| 09/04/2026 | Migration ServiceChain (OpenCDS) finalisée — 1er module métier migré |
| 28/05/2026 | Migration du module **Project** (5 routes projet + 1 export CSV) |
| 09/06/2026 | Migration de **ProjectMember** (4 routes) |
| 13/06/2026 | Migration de **ProjectRoles** (5), **ProjectSecrets** (1), **ProjectServices** (2), **ProjectHooks** (1) |
| 16/06/2026 | Migration de **ProjectBulk** (1), **Deployment** (4), **Log** (1), **Healthz** (1), **Version** (1), **SystemSettings** (2) |
| 26/06/2026 | Mise à jour du statut d'avancement : 33 routes migrées (~44%) |

---

## 📞 Contacts & Communication

### Canaux
- **Slack** : #backend-modularisation
- **Meeting hebdo** : Vendredi 16h (30min)
- **Lead technique** : @stephane.trebel

### Besoin d'aide ?
- **Question technique** : Poser sur #backend-modularisation
- **Conflit de développement** : Contacter @stephane.trebel
- **Urgence production** : Suivre la procédure de rollback (voir [PLAN nginx-strangler](../mise-en-place-nginx-etrangleur/PLAN.md))

---

## 📚 Documentation

- [00-OVERVIEW.md](00-OVERVIEW.md) - Vue d'ensemble du projet
- [01-MODULARISATION-STRATEGIE.md](01-MODULARISATION-STRATEGIE.md) - Stratégie de modularisation
- [02-ARCHITECTURE-MODULES.md](02-ARCHITECTURE-MODULES.md) - Pattern d'un module NestJS
- [MODULARISATION-CARTOGRAPHIE.md](MODULARISATION-CARTOGRAPHIE.md) - Cartographie des modules
- [../mise-en-place-nginx-etrangleur/PLAN.md](../mise-en-place-nginx-etrangleur/PLAN.md) - Plan nginx-strangler (routage Strangler Fig)

---

## 🔄 Historique des changements

### 2026-07-16
- ✅ Reconciliation de la documentation avec l'état réel du code (`main.module.ts`, `routing.conf`)
- ✅ Ajout de la distinction « exposé / routé / encapsulé / code non câblé »
- ✅ Bascule nginx `location /api/v1/projects` vers `server-nestjs` (project + 6 sous-modules)
- 🔧 Correction : `admin-token` et `user-tokens` n'existent pas encore en codebase (retirés du comptage de migration)

### 2026-06-26
- ✅ Mise à jour du statut d'avancement (33/75 routes exposées, ~44%)
- ✅ Suppression des plannings sprints obsolètes
- ✅ Ajout de la liste des modules métier restants (cartographie mise à jour)
- ✅ Ajout du statut d'encapsulation des plugins

### 2026-06-16
- ✅ Migration de **ProjectBulk** (1 route)
- ✅ Migration de **Deployment** (4 routes)
- ✅ Migration de **Log** (1 route)
- ✅ Migration de **Healthz** (1 route)
- ✅ Migration de **Version** (1 route)
- ✅ Migration de **SystemSettings** (2 routes)

### 2026-06-13
- ✅ Migration de **ProjectRoles** (5 routes)
- ✅ Migration de **ProjectSecrets** (1 route)
- ✅ Migration de **ProjectServices** (2 routes)
- ✅ Migration de **ProjectHooks** (1 route)

### 2026-06-09
- ✅ Migration de **ProjectMember** (4 routes)

### 2026-05-28
- ✅ Migration du module **Project** (5 routes projet + export CSV)
- ✅ Création des guards projet : `ProjectGuard`, `ProjectStatusGuard`, `ProjectLockedGuard`
- ✅ Création des décorateurs `@Project()`, `@RequireProjectStatus()`, `@RequireProjectLocked()`
- ✅ Création de `UserGuard` + décorateur `@AuthUser()`
- ✅ Build et lint verts (server-nestjs)

### 2026-04-09
- ✅ Migration du module **ServiceChain (OpenCDS)** — 5 routes, proxy HTTP vers API externe
- ✅ Création de l'**AuthModule** : auth par token `x-dso-token` + bearer JWT Keycloak
- ✅ Configuration **nginx-strangler** pour les routes service-chain
- ✅ Fix Docker : build order shared → server-nestjs
- ✅ Mise à jour de ce fichier de suivi

### 2026-01-07 (S1)
- ✅ Création du fichier de suivi
- ✅ Initialisation de la documentation
- ✅ Kickoff du projet

---

## 📝 Notes

> Ce fichier sera mis à jour régulièrement (minimum une fois par sprint, idéalement en temps réel).
> Toute l'équipe peut consulter ce fichier pour connaître l'état actuel de la modularisation.
> Pour proposer des modifications ou signaler des incohérences, utiliser #backend-modularisation.

---

**Version du fichier** : 1.3
**Responsable de mise à jour** : Lead technique backend
