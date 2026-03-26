# État de la modularisation Backend → NestJS

> 📋 **Ce fichier est mis à jour en temps réel**
> Dernière mise à jour : **2026-04-09**

---

## 🎯 Progression globale

![Progress](https://progress-bar.dev/7/?title=modularisation&width=400)

**~7%** complété (1/18 modules métier migrés, 5/75 routes)

---

## 📊 Vue d'ensemble

| Statut | Nombre de modules | % du total |
|--------|-------------------|------------|
| ✅ Migré | 1 (ServiceChain) | ~6% |
| 🚧 En cours | 0 | 0% |
| 📅 Planifié | 17 | ~94% |
| ⏳ En attente de cartographie | 0 | 0% |

---

## ✅ Modules migrés

### ServiceChain (OpenCDS) — migré le 2026-04-09

Module proxy HTTP vers l'API externe OpenCDS (gestion des chaînes de service
réseau). Migré en avance de phase par rapport au planning initial (prévu V3/S8),
profitant de son isolement complet vis-à-vis du reste du codebase.

- **Routes** : 5 (`/api/v1/service-chains/...`)
- **Auth** : Token uniquement (`x-dso-token`), pas de session Keycloak
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

### Infrastructure transverse déployée

En support de cette migration, les éléments d'infrastructure suivants ont été
créés :

- **AuthModule** (`infrastructure/auth/`) : `AuthService` (validation token
  SHA256 via Prisma) + `AdminPermissionGuard` + décorateur
  `@RequireAdminPermission()`
- **Nginx strangler** : Reverse proxy configuré pour router les routes migrées
  vers server-nestjs, le reste vers le legacy
- **Docker** : Build order corrigé (shared avant server-nestjs)

> **Limitation connue** : Seule l'auth par token (`x-dso-token`) est supportée.
> L'auth par session Keycloak (`@CurrentUser()`) sera ajoutée lors de la
> migration de la couche auth complète (Couche 0a de la cartographie).

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
- **Migrés** : 5 (~7%)
- **En cours** : 0 (0%)
- **Restants** : ~70 (~93%)

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
