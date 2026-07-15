# État de la modularisation Backend → NestJS

> 📋 **Ce fichier est mis à jour en temps réel**
> Dernière mise à jour : **2026-07-15** (réconciliation avec l'état réel du code `server-nestjs`)

---

## ⚠️ Faisabilité de ce fichier

L'état ci-dessous est reconstitué à partir de l'analyse du code source
(`apps/server-nestjs/src/main.module.ts`, les `*.module.ts` / `*.controller.ts`
et `apps/nginx-strangler/conf.d/routing.conf`). Il **remplace** les anciennes
estimations (1 module / 5 routes / ~7 %) qui étaient obsolètes.

**Règle de comptage adoptée :**
- Un module est considéré **MIGRÉ** s'il est déclaré dans `main.module.ts`
  (donc réellement exposé par l'application).
- Une route est comptée si elle porte un décorateur `@Get/@Post/@Put/@Patch/@Delete`
  sur un controller déclaré dans `main.module.ts`.
- Les modules de plugins présents sur disque mais **non importés** dans
  `main.module.ts` (donc sans route exposée) sont listés à part comme
  « encapsulés, non câblés ».

---

## 🎯 Progression globale

**~12% routé (9/75)** — mais **~47% en code exposé** (35 routes sur ~75,
13 modules à controllers déclarés dans `main.module.ts` ; +2 routes de
`system-config` présentes en code mais non câblées).

---

## ✅ Modules exposés (déclarés dans `main.module.ts`)

| Module | Controller | Routes | Auth | Nginx |
|--------|-----------|--------|------|-------|
| version (`/api/v1/version`) | ✅ | 1 | aucune | legacy (non basculé) |
| healthz (`/api/v1/healthz`) | ✅ | 1 | aucune | legacy (non basculé) |
| system-settings (`/api/v1/system/settings`) | ✅ | 2 (`GET`, `PUT :key`) | admin | legacy (non basculé) |
| service-chain (`/api/v1/service-chains`) | ✅ | 5 | token/JWT | ✅ **bascule complète** |
| system-config (`/api/v1/system/plugins`) | ⚠️ code présent, **NON déclaré** dans `main.module.ts` | 2 (`GET`, `POST`) | admin | legacy (non basculé) |
| log (`/api/v1/projects/:projectId/logs`) | ✅ | 1 | projet | legacy (non basculé) |
| project (`/api/v1/projects`) | ✅ | 7 | projet/admin | legacy (non basculé) |
| project-services (`/api/v1/projects/:projectId/services`) | ✅ | 2 | projet | legacy (non basculé) |
| project-secrets (`/api/v1/projects/:projectId/secrets`) | ✅ | 1 | projet | legacy (non basculé) |
| project-roles (`/api/v1/projects/:projectId/roles`) | ✅ | 5 | projet | legacy (non basculé) |
| project-members (`/api/v1/projects/:projectId/members`) | ✅ | 4 | projet | legacy (non basculé) |
| project-hooks (`/api/v1/projects/:projectId/hooks`) | ✅ | 1 (`PUT`) | projet | legacy (non basculé) |
| project-bulk (`/api/v1/admin/projects`) | ✅ | 1 (`POST`) | admin | legacy (non basculé) |
| deployment (`/api/v1/projects/:projectId/deployments`) | ✅ | 4 | projet | ✅ **bascule (regex)** |

**Total routes exposées** (controllers déclarés dans `main.module.ts`) :
**35 routes** sur 13 modules. Si l'on compte `system-config` (code présent,
non câblé) : 37 routes.

### Détail par module

- **service-chain** : 5 routes (`GET /`, `GET /:id`, `GET /:id/flows`,
  `POST /:id/retry`, `POST /validate/:id`). Auth par token + bearer JWT via
  `AuthService`/`UserGuard`. Client OpenCDS dédié. Bascule nginx complète.
- **deployment** : 4 routes (`GET`, `POST`, `PUT :deploymentId`,
  `DELETE :deploymentId`) sur `projects/:projectId/deployments`. Bascule nginx
  par regex `^/api/v1/projects/[^/]+/deployments(.*)$`.
- **project** (cœur) : 7 routes CRUD + data export (`GET /data`, `GET`, `POST`,
  `GET /:projectId`, `PUT /:projectId`, `Delete /:projectId`).
- **project-roles** : 5 routes (list, create, patch, member-counts, delete).
- **project-members** : 4 routes (list, create, patch, delete).
- **project-services** : 2 routes (list, update).
- **project-secrets** : 1 route (get). Importe `VaultModule`.
- **project-hooks** : 1 route (PUT replay).
- **project-bulk** : 1 route (`POST /admin/projects/bulk`).
- **log** : 1 route (GET sur `projects/:projectId/logs`).
- **system-settings** : 2 routes (`GET`, `PUT :key`).
- **version**, **healthz** : 1 route chacun, sans auth.

### 🔧 Anomalies détectées (à corriger)

1. **system-config non câblé** : `SystemConfigModule` possède un controller
   (`/api/v1/system/plugins`, 2 routes admin) mais **n'est pas importé** dans
   `main.module.ts`. Le module existe donc en code sans être exposé.
2. **Bascule nginx incomplète** : Bien que ~13 modules (35 routes) soient
   exposés par `server-nestjs`, seuls `service-chains` (5) et `deployments`
   (4) sont routés vers `server-nestjs` dans `routing.conf`. Tous les autres
   (projects, membres, roles, secrets, log, settings, version, healthz)
   restent servis par le legacy via le fallback `location /api/`.
3. **Modules de plugins non exposés** : `vault`, `gitlab`, `registry/harbor`,
   `nexus`, `argocd`, `sonarqube`, `keycloak` existent sur disque et sont
   importés en interne (notamment via `PluginModule`/`HealthzModule`), mais
   **aucun n'expose de route** `main.module.ts` (seul `vault` est importé par
   `project-secrets` et `healthz`). Voir ci-dessous.

---

## 🔌 Modules de plugins encapsulés (présents sur disque, non routés)

Ces modules NestJS encapsulent les plugins legacy mais ne sont pas (encore)
exposés directement par l'application :

| Plugin | Fichier module | Importé par | Route exposée ? |
|--------|---------------|-------------|-----------------|
| vault | `modules/vault/vault.module.ts` | project-secrets, healthz, registry, gitlab, nexus, argocd, sonarqube, plugin | ❌ (service only) |
| gitlab | `modules/gitlab/gitlab.module.ts` | argocd, plugin, healthz | ❌ |
| registry (harbor) | `modules/registry/registry.module.ts` | plugin | ❌ |
| nexus | `modules/nexus/nexus.module.ts` | plugin | ❌ |
| argocd | `modules/argocd/argocd.module.ts` | plugin, healthz | ❌ |
| sonarqube | `modules/sonarqube/sonarqube.module.ts` | plugin | ❌ |
| keycloak | `modules/keycloak/keycloak.module.ts` | plugin, healthz | ❌ |
| opencds | `modules/opencds/opencds.module.ts` | (service-chain) | ❌ |
| plugin | `modules/plugin/plugin.module.ts` | — | ❌ |

> Note : `PluginModule` agrège argocd, gitlab, registry, keycloak, nexus,
> sonarqube, vault mais n'est **pas** déclaré dans `main.module.ts`.

---

## 🚧 En cours de modularisation

### Aucune (état figé au 2026-07-15)

Les modules sont présents en code ; la bascule nginx et le câblage de
`system-config` / `PluginModule` restent à faire pour « activer » ce qui existe
déjà.

---

## 📅 Modules planifiés (restants)

Basé sur la cartographie `MODULARISATION-CARTOGRAPHIE.md` (routes legacy non
encore reproduites dans `server-nestjs`) :

- **admin-token** (~3 routes), **user/tokens** (~3), **user** (~4),
  **admin-role** (~5), **stage** (~5), **zone** (~4), **cluster** (~7),
  **environment** (~4), **repository** (~5), **service-monitor** (~3).
- **Routes legacy totales estimées** : ~75. **Exposées en code** : 35 (+2
  system-config non câblé) ; **réellement basculées (nginx)** : 9.
  **Restantes** : ~33.

---

## 🚫 Zones en feature freeze

### Aucune zone gelée actuellement

**Règle** : Quand un module passe en statut 🚧 (En cours), il est
automatiquement en feature freeze.

---

## 📈 Métriques de qualité

### Couverture de tests

| Type | Initial | Actuel | Objectif |
|------|---------|--------|----------|
| E2E Playwright | 33% | ? (non mesuré ici) | 50% |
| Unitaires Vitest | ? | présents (fichiers `*.spec.ts`) | 70% |
| Tests de contrat | 0% | 0% | 100% |

### Routes par statut

- **Total (legacy)** : ~75 routes métier
- **Exposées par server-nestjs** : 35 routes (13 modules à controller déclarés)
  + 2 routes `system-config` (code, non câblé) = 37 ; la majorité **non routée**
  via nginx vers le legacy.
- **Réellement basculées (nginx → server-nestjs)** : service-chains (5) +
  deployments (4) = **9 routes (~12%)**
- **Restantes (code + routage)** : ~33

---

## 🗓️ Dates clés

| Date | Événement |
|------|-----------|
| 07/01/2026 | Début du projet (S1) |
| 26/01/2026 | Fin de la cartographie (S2) |
| 09/04/2026 | Migration ServiceChain (OpenCDS) finalisée — 1er module métier migré |
| 2026-06-16 | Dernière MAJ documentaire (STATUT à ~7%) — **obsolète** |
| 2026-07-15 | Réconciliation : 13 modules exposés (35 routes) + system-config (2, non câblé) |

---

## 📞 Contacts & Communication

### Canaux
- **Mattermost** : #backend-modularisation
- **Lead technique** : @stephane.trebel

### Besoin d'aide ?
- **Question technique** : Poser sur #backend-modularisation
- **Conflit de développement** : Contacter @stephane.trebel

---

## 📚 Documentation

- [00-OVERVIEW.md](00-OVERVIEW.md) - Vue d'ensemble du projet
- [01-MODULARISATION-STRATEGIE.md](01-MODULARISATION-STRATEGIE.md) - Stratégie de modularisation
- [02-ARCHITECTURE-MODULES.md](02-ARCHITECTURE-MODULES.md) - Pattern d'un module NestJS
- [MODULARISATION-CARTOGRAPHIE.md](MODULARISATION-CARTOGRAPHIE.md) - Cartographie des modules (référence des vagues/plugins)
- [../mise-en-place-nginx-etrangleur/PLAN.md](../mise-en-place-nginx-etrangleur/PLAN.md) - Plan nginx-strangler

---

## 🔄 Historique des changements

### 2026-07-15
- ✅ Réconciliation du suivi avec l'état réel du code `server-nestjs`
- ✅ Recensement des 13 controllers exposés (35 routes) + system-config (2, non câblé)
- ✅ Recensement des 7+ modules de plugins encapsulés mais non routés
- ✅ Signalement des anomalies : `SystemConfigModule` non câblé,
  bascule nginx incomplète, `PluginModule` non déclaré
- ⚠️ Remplacement des anciennes estimations (~7%) devenues obsolètes

### 2026-04-09
- ✅ Migration du module **ServiceChain (OpenCDS)** — 5 routes
- ✅ Création de l'**AuthModule** (infrastructure/auth/)
- ✅ Configuration **nginx-strangler** pour les routes service-chain
- ✅ Fix Docker : build order shared → server-nestjs

### 2026-01-07 (S1)
- ✅ Création du fichier de suivi
- ✅ Initialisation de la documentation

---

> Ce fichier reflète l'état vérifié du code. Pour proposer des modifications,
> utiliser #backend-modularisation.

**Version du fichier** : 2.0
**Responsable de mise à jour** : Équipe backend (réconciliation automatique)
