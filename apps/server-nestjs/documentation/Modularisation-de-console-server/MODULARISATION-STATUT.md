# État de la modularisation Backend → NestJS

> 📋 **Ce fichier est mis à jour en temps réel**
> Dernière mise à jour : **2026-06-16**

---

## 🎯 Progression globale

**~24%** complété (4/18 modules métier migrés, 21/75 routes)

---

## 📊 Vue d'ensemble

| Statut | Nombre de modules | % du total |
|--------|-------------------|------------|
| ✅ Migré | 4 (ServiceChain, Project, ProjectMembers, AdminRole) | ~22% |
| 🚧 En cours | 0 | 0% |
| 📅 Planifié | 14 | ~78% |
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

Module cœur de gestion des projets (CRUD, secrets, bulk actions).
Regroupe les sous-modules `project-core`, `project-secrets` et `project-bulk`
découpés dans la cartographie Vague 4, implémentés ici en un seul module
unifié pour accélérer la migration.

- **Routes** : 7 (`/api/v1/projects/...`)
- **Auth** : Token (`x-dso-token`) + guards projet (`ProjectContextGuard`, `ProjectStatusGuard`, `ProjectLockedGuard`)
- **Validation** : Contrats Zod via `projectContract` de `@cpn-console/shared` avec `ZodValidationPipe`
- **Tests** : Controller + Service couverts (Vitest)

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/projects/data` | `Manage` (admin) |
| `GET` | `/api/v1/projects` | Authentifié |
| `POST` | `/api/v1/projects` | `ManageProjects` (admin) + type `human` |
| `POST` | `/api/v1/projects-bulk` | `Manage` (admin) |
| `GET` | `/api/v1/projects/:projectId` | Authentifié + projet |
| `GET` | `/api/v1/projects/:projectId/secrets` | Authentifié + projet (statut ≠ archived) |
| `PUT` | `/api/v1/projects/:projectId` | Authentifié + projet (statut ≠ archived) |

**Infrastructure créée/mise à jour** :
- `ProjectContextGuard` + `Project` decorator : chargement du projet par id/slug, résolution des permissions via bitmask
- `ProjectStatusGuard` + `@RequireProjectStatus()` : filtrage par statut du projet
- `ProjectLockedGuard` : protection contre les modifications de projets verrouillés
- `UserGuard` + `User` decorator : authentification token + injection du contexte utilisateur

**Différences avec le legacy** :
- Utilisation de `projectContract` de `@cpn-console/shared` pour les schemas de validation (cohérence client/serveur)
- ZodValidationPipe au lieu de la validation ts-rest implicite
- Les routes `secrets` et `bulk` sont fusionnées dans le module Project (pas de sous-modules séparés)
- Pas de `DELETE /api/v1/projects/:projectId` (archivage) dans cette version initiale

### ProjectMembers — migré le 2026-05-28

Module de gestion des membres projet (ajout, modification, suppression, liste).
Dédié aux routes `/api/v1/projects/:projectId/members/...`.

- **Routes** : 4 (`/api/v1/projects/:projectId/members/...`)
- **Auth** : Token (`x-dso-token`) + guards projet (`ProjectContextGuard`, `ProjectStatusGuard`, `ProjectLockedGuard`)
- **Validation** : Contrats Zod via `projectMemberContract` de `@cpn-console/shared`

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/projects/:projectId/members` | `ListMembers` (admin) |
| `POST` | `/api/v1/projects/:projectId/members` | `ManageMembers` (admin) + statut non archivé |
| `PATCH` | `/api/v1/projects/:projectId/members` | `ManageMembers` (admin) + statut non archivé |
| `DELETE` | `/api/v1/projects/:projectId/members/:userId` | `ManageMembers` (admin) ou auto-suppression + statut non archivé |

**Fichiers** :
- `src/modules/project/project-members.controller.ts`
- Méthodes ajoutées dans `src/modules/project/project.service.ts`

**Différences avec le legacy** :
- Recherche par email non disponible (nécessite le hook Keycloak `user.retrieveUserByEmail`, non migré)
- Retour de la liste complète des membres après chaque mutation (cohérence avec le legacy)
- Événements `projectMember.upsert` et `projectMember.delete` via EventEmitter (remplacement du hook `projectMember.upsert`/`projectMember.delete`)

### AdminRole — migré le 2026-06-12

Module de gestion des rôles administrateurs (CRUD + tri + comptage membres).
Dédié aux routes `/api/v1/admin/roles/...`.

- **Routes** : 5 (`/api/v1/admin/roles/...`)
- **Auth** : Guards admin (`AdminGuard`) + décorateur `@RequireAdminPermission()`
- **Validation** : Contrats Zod via `adminRoleContract` de `@cpn-console/shared` avec `ZodValidationPipe`
- **Tests** : Controller + Service couverts (Vitest)

| Méthode | Route | Permission |
|---------|-------|------------|
| `GET` | `/api/v1/admin/roles` | `ListRoles` |
| `POST` | `/api/v1/admin/roles` | `ManageRoles` |
| `PATCH` | `/api/v1/admin/roles` | `ManageRoles` |
| `GET` | `/api/v1/admin/roles/member-counts` | `ManageRoles` |
| `DELETE` | `/api/v1/admin/roles/:roleId` | `ManageRoles` |

**Infrastructure réutilisée** :
- `AdminGuard` + `@RequireAdminPermission()` : validation des permissions admin
- `AdminService` : validation bitmask + typage utilisateur

**Fichiers** :
- `src/modules/admin-role/admin-role.controller.ts`
- `src/modules/admin-role/admin-role.service.ts`
- `src/modules/admin-role/admin-role.utils.ts`

**Différences avec le legacy** :
- Déport de la logique de permissions côté NestJS plutôt que dans le legacy Fastify
- Comptage des membres via query Prisma dédiée au lieu d'agrégat

### Infrastructure transverse déployée

En support de ces migrations, les éléments d'infrastructure suivants ont été
créés :

- **AuthModule** (`infrastructure/auth/`) : `AuthService` (validation token
  SHA256 via Prisma) + `AdminPermissionGuard` + décorateur
  `@RequireAdminPermission()`
- **Guards projet** (`infrastructure/auth/`) : `ProjectContextGuard`,
  `ProjectStatusGuard`, `ProjectLockedGuard` + décorateurs `@Project()` et
  `@RequireProjectStatus()`
- **Nginx strangler** : Reverse proxy configuré pour router les routes migrées
  vers server-nestjs, le reste vers le legacy
- **Docker** : Build order corrigé (shared avant server-nestjs)

> **Limitation connue** : l'auth par session Keycloak et le flux bearer JWT ont
> désormais la même entrée publique (`AuthService.authenticate(request, ...)`),
> mais les usages côté contrôleurs restent encore à homogénéiser au fil des
> modules migrés.

---

## 🚧 En cours de modularisation

### Aucune modularisation en cours

---

## 📅 Modules planifiés

> Ces informations seront affinées après la cartographie (fin S2).

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
- **Migrés** : 21 (~28%)
- **En cours** : 0 (0%)
- **Restants** : ~54 (~72%)

---

## 🗓️ Dates clés

| Date | Événement |
|------|-----------|
| 07/01/2026 | Début du projet (S1) |
| 26/01/2026 | Fin de la cartographie (S2) |
| 27/01/2026 | Début modularisation Auth (S3) |
| 09/02/2026 | Fin modularisation Auth (S4) - 20% complété |
| 28/05/2026 | Migration du module **Project** (7 routes) — CRUD + secrets + bulk |
| 28/05/2026 | Migration du module **ProjectMembers** (4 routes) — membres projet |
| 12/06/2026 | Migration du module **AdminRole** (5 routes) — gestion des rôles admin |
| 06/04/2026 | Fin de modularisation - 100% complété |

---

## 📞 Contacts & Communication

### Canaux
- **Mattermost** : #backend-modularisation
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

### 2026-06-12
- ✅ Migration du module **AdminRole** — 5 routes : gestion des rôles admin (list, create, patch, member-counts, delete)
- ✅ Mise à jour du contrôleur pour utiliser `AdminGuard` + `@RequireAdminPermission()`
- ✅ Création des utilitaires de mapping `AdminRole` Prisma → `@cpn-console/shared`

### 2026-05-28
- ✅ Migration du module **Project** — 7 routes : CRUD projets, secrets, bulk actions, export CSV
- ✅ Migration du module **ProjectMembers** — 4 routes : membres projet (list, add, patch, delete)
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

**Version du fichier** : 1.2
**Responsable de mise à jour** : Lead technique backend
