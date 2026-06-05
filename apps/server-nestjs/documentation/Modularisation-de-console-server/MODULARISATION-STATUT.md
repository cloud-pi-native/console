# État de la modularisation Backend → NestJS

> 📋 **Ce fichier est mis à jour en temps réel**
> Dernière mise à jour : **2026-06-25** (migration project-bulk, mise à jour des statuts)

---

## 🎯 Progression globale

![Progress](https://progress-bar.dev/44/?title=modularisation&width=400)

**~44%** complété (13/18 modules métier migrés, 33/75 routes)

---

## 📊 Vue d'ensemble

| Statut | Nombre de modules | % du total |
|--------|-------------------|------------|
| ✅ Migré | 13 (ServiceChain, Project, ProjectMember, ProjectRoles, ProjectSecrets, ProjectServices, ProjectHooks, ProjectBulk, Deployment, Log, Healthz, Version, SystemSettings) | ~72% |
| 🚧 En cours | 0 | 0% |
| 📅 Planifié | 5 | ~28% |
| ⏳ En attente de cartographie | 0 | 0% |

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

---

## 🚧 En cours de modularisation

### Aucune modularisation en cours

---

## 📅 Modules planifiés

> Ces informations seront affinées après la cartographie (fin S2)

### Sprint 3-4 (27 janvier - 9 février)
- **Module** : Auth
- **Responsable** : @stephane.trebel
- **Routes** : ~5
- **Criticité** : 🔴 Haute
- **Statut** : 📅 Planifié

### Sprint 5-6 (10-23 février)
- **Module** : Users
- **Responsable** : TBD
- **Routes** : ~10
- **Criticité** : 🔴 Haute
- **Statut** : 📅 Planifié

### Sprint 7-8 (24 février - 9 mars)
- **Module** : À définir (selon cartographie)
- **Responsable** : TBD
- **Routes** : TBD
- **Statut** : 📅 Planifié

### Sprint 9-10 (10-23 mars)
- **Module** : À définir (selon cartographie)
- **Responsable** : TBD
- **Routes** : TBD
- **Statut** : 📅 Planifié

### Sprint 11-12 (24 mars - 6 avril)
- **Modules** : Finalisation + cleanup
- **Responsable** : Équipe
- **Objectif** : Suppression du legacy

---

## 🚫 Zones en feature freeze

### Aucune zone gelée actuellement

**Règle** : Quand un module passe en status 🚧 (En cours), il est automatiquement en feature freeze.

**Que faire si vous devez travailler sur une zone gelée ?**
1. Vérifier l'urgence réelle (Critique / Importante / Normale)
2. Consulter la [matrice de décision](04-COMMUNICATION-PLAN.md#matrice-de-décision-pour-développeurs)
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

- **Total** : ~75 routes métier
- **Migrés** : 33 (~44%)
- **En cours** : 0 (0%)
- **Restants** : ~42 (~56%)

---

## 🗓️ Dates clés

| Date | Événement |
|------|-----------|
| 07/01/2026 | Début du projet (S1) |
| 26/01/2026 | Fin de la cartographie (S2) |
| 27/01/2026 | Début modularisation Auth (S3) |
| 09/02/2026 | Fin modularisation Auth (S4) - 20% complété |
| 09/03/2026 | Point mi-parcours - 60% complété |
| 26/03/2026 | Migration ServiceChain (OpenCDS) finalisée — 1er module métier migré |
| 28/05/2026 | Migration du module **Project** (6 routes) — CRUD + export |
| 09/06/2026 | Migration de **ProjectMember** (4 routes) |
| 13/06/2026 | Migration de **ProjectRoles** (5 routes), **ProjectSecrets** (1), **ProjectServices** (2), **ProjectHooks** (1) |
| 16/06/2026 | Migration de **ProjectBulk** (1), **Deployment** (4), **Log** (1), **Healthz** (1), **Version** (1), **SystemSettings** (2) |
| 06/04/2026 | Fin de modularisation - 100% complété |

---

## 📞 Contacts & Communication

### Canaux
- **Slack** : #backend-modularisation
- **Meeting hebdo** : Vendredi 16h (30min)
- **Lead technique** : @stephane.trebel

### Besoin d'aide ?
- **Question technique** : Poser sur #backend-modularisation
- **Conflit de développement** : Contacter @stephane.trebel
- **Urgence production** : Suivre la procédure de rollback (voir [01-TECHNICAL-SETUP.md](01-TECHNICAL-SETUP.md))

---

## 📚 Documentation

- [00-OVERVIEW.md](00-OVERVIEW.md) - Vue d'ensemble du projet
- [01-TECHNICAL-SETUP.md](01-TECHNICAL-SETUP.md) - Configuration technique
- [02-modularisation-STRATEGY.md](02-modularisation-STRATEGY.md) - Stratégie de modularisation
- [03-PLANNING.md](03-PLANNING.md) - Planning détaillé 12 sprints
- [04-COMMUNICATION-PLAN.md](04-COMMUNICATION-PLAN.md) - Plan de communication
- [05-TESTING-STRATEGY.md](05-TESTING-STRATEGY.md) - Stratégie de tests
- [modularisation_MAP.md](modularisation_MAP.md) - Cartographie des modules

---

## 🔄 Historique des changements

### 2026-05-28
- ✅ Migration du module **Project** — 7 routes : CRUD projets, secrets, bulk actions, export CSV
- ✅ Migration du module **ProjectMember** — 4 routes : membres projet (list, add, patch, delete)
- ✅ Création des guards projet : `ProjectContextGuard`, `ProjectStatusGuard`, `ProjectLockedGuard`
- ✅ Création des décorateurs `@Project()` et `@RequireProjectStatus()`
- ✅ Utilisation de `projectContract` de `@cpn-console/shared` pour la validation Zod
- ✅ Build et lint verts (server-nestjs)

### 2026-04-09
- ✅ Migration du module **ServiceChain (OpenCDS)** — 5 routes, proxy HTTP vers API externe
- ✅ Création de l'**AuthModule** (infrastructure/auth/) : auth par token `x-dso-token`
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

**Version du fichier** : 1.1
**Responsable de mise à jour** : Lead technique backend
