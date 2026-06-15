# Cartographie des modules/plugins — Cloud Pi Native Console

> **Issue:** [#2181](https://github.com/cloud-pi-native/console/issues/2181) — Initialiser une cartographie des modules/plugins
> **Statut:** Brouillon
> **Date:** 2026-06-15

## 1. Vue d'ensemble

La console Cloud Pi Native est un monorepo pnpm organisé autour d'un système de **hooks** (cycle de vie) et de **plugins** (services externes). Les plugins s'enregistrent sur des hooks pour réagir aux événements métier (création/suppression de projet, zone, cluster, rôle, membre).

### 1.1 Architecture en couches

```
┌─────────────────────────────────────────────────────────┐
│                    apps/server (Fastify)                 │
│  resources/ → business.ts → hooks (via pluginManager)   │
├─────────────────────────────────────────────────────────┤
│              packages/hooks (moteur de hooks)            │
│  Hook lifecycle: pre → main → post → revert             │
│  Exécution parallèle des plugins par étape              │
├──────────┬──────────┬──────────┬──────────┬────────────┤
│  GitLab  │  ArgoCD  │  Vault   │ Keycloak │   Harbor   │
│  plugin  │  plugin  │  plugin  │  plugin  │   plugin   │
├──────────┼──────────┼──────────┼──────────┼────────────┤
│  Nexus   │ SonarQube│          │          │            │
│  plugin  │  plugin  │          │          │            │
└──────────┴──────────┴──────────┴──────────┴────────────┘
```

### 1.2 Principes clés

- **Hooks = contrats d'interface** entre la console et les services externes
- Chaque hook a un **type d'argument** (Project, Zone, Cluster, etc.) partagé
- Les plugins exposent des **API** (`payload.apis.<plugin>`) accessibles par les autres plugins dans le même hook
- Le cycle de vie est : `pre` → `main` → `post`, avec `revert` en cas d'échec
- Les plugins s'enregistrent via `pluginManager.register()` dans `apps/server/src/plugins.ts`

---

## 2. Inventaire des plugins

| Plugin | Rôle principal | Fichier d'entrée | API exposée |
|--------|---------------|-------------------|-------------|
| **GitLab** | Gestion des groupes, dépôts, utilisateurs, fichiers | `plugins/gitlab/src/index.ts` | `GitlabProjectApi`, `GitlabZoneApi` |
| **ArgoCD** | Provisioning des environnements Kubernetes via GitOps | `plugins/argocd/src/index.ts` | *(aucune API exposée)* |
| **Vault** | Stockage des secrets (KV v2) | `plugins/vault/src/index.ts` | `VaultProjectApi`, `VaultZoneApi` |
| **Keycloak** | IAM — groupes, rôles, clients OIDC | `plugins/keycloak/src/index.ts` | `KeycloakProjectApi` |
| **Harbor** | Registry Docker — projets, robots, quotas | `plugins/harbor/src/index.ts` | *(aucune API exposée)* |
| **Nexus** | Repository manager (Maven, npm) | `plugins/nexus/src/index.ts` | *(aucune API exposée)* |
| **SonarQube** | Analyse de code — projets, tokens, variables CI | `plugins/sonarqube/src/index.ts` | *(aucune API exposée)* |

---

## 3. Cartographie des hooks et souscriptions

### 3.1 `upsertProject` (Hook<Project>)

**Déclencheur:** Création ou mise à jour d'un projet

| Étape | Plugin | Fonction | Description |
|-------|--------|----------|-------------|
| `check` | GitLab | `checkApi` | Vérifie que l'utilisateur root n'est pas utilisé |
| `main` | GitLab | `upsertDsoProject` | Crée/met à jour le groupe GitLab, les sous-groupes, les dépôts, les miroirs. Écrit les secrets GitLab dans Vault |
| `main` | Keycloak | `upsertProject` | Crée le groupe projet, les sous-groupes d'environnement (RO/RW), synchronise les membres |
| `main` | Vault | `upsertProject` | Provisionne le chemin de secrets KV v2 pour le projet |
| `main` | Nexus | `createNexusProject` | Crée les repositories Maven et npm |
| `main` | SonarQube | `upsertProject` | Crée/met à jour les projets SonarQube, crée l'utilisateur bot, écrit le token dans Vault |
| `main` | ArgoCD | `upsertProject` | Génère les fichiers values.yaml dans le dépôt infra GitLab pour chaque environnement |
| `post` | Harbor | `createDsoProject` | Crée le projet Harbor, les robots (RO/RW/project), les permissions de groupe, la politique de rétention |
| `post` | GitLab | `commitFiles` | Commit des fichiers additionnels dans le dépôt GitLab |
| `post` | SonarQube | `setVariables` | Injecte les variables SonarQube (PROJECT_KEY, SONAR_TOKEN) dans les CI/CD GitLab (repo + groupe) |

**Flux d'interaction:**

```
upsertProject
├── check: GitLab
├── main: GitLab ──write──> Vault (secrets GITLAB)
├── main: Keycloak
├── main: Vault (upsertProject)
├── main: Nexus
├── main: SonarQube ──read──> Vault, ──read──> Keycloak, ──write──> Vault (secrets SONAR)
├── main: ArgoCD ──read──> GitLab (API), ──read──> Keycloak (API), ──read──> Vault (API)
├── post: Harbor ──read──> Vault (API), ──read──> Keycloak (API)
├── post: GitLab (commitFiles)
└── post: SonarQube ──read──> Vault, ──read──> GitLab (API)
```

### 3.2 `deleteProject` (Hook<Project>)

**Déclencheur:** Suppression d'un projet

| Étape | Plugin | Fonction | Description |
|-------|--------|----------|-------------|
| `main` | GitLab | `deleteDsoProject` | Supprime le groupe GitLab et tous les dépôts |
| `main` | Harbor | `deleteDsoProject` | Supprime le projet Harbor |
| `main` | Nexus | `deleteNexusProject` | Supprime les repositories Nexus |
| `main` | SonarQube | `deleteProject` | Supprime les projets SonarQube, anonymise l'utilisateur |
| `main` | ArgoCD | `deleteProject` | Supprime les fichiers values.yaml du dépôt infra GitLab |
| `post` | Keycloak | `deleteProject` | Supprime le groupe projet Keycloak |
| `post` | GitLab | `commitFiles` | Commit des fichiers supprimés |
| `post` | Vault | `archiveDsoProject` | Détruit tous les secrets du projet dans Vault |

### 3.3 `upsertZone` (Hook<ZoneObject>)

**Déclencheur:** Création ou mise à jour d'une zone

| Étape | Plugin | Fonction | Description |
|-------|--------|----------|-------------|
| `pre` | Vault | `upsertZone` | Provisionne le chemin de secrets KV v2 pour la zone |
| `pre` | GitLab | `upsertZone` | Crée le projet infra GitLab pour la zone |
| `main` | Keycloak | `upsertZone` | Crée/met à jour le client OIDC pour ArgoCD. Écrit le clientSecret dans Vault |
| `post` | GitLab | `commitFiles` | Commit des fichiers dans le dépôt zone |

### 3.4 `deleteZone` (Hook<ZoneObject>)

**Déclencheur:** Suppression d'une zone

| Étape | Plugin | Fonction | Description |
|-------|--------|----------|-------------|
| `main` | GitLab | `deleteZone` | Supprime le dépôt infra GitLab de la zone |
| `main` | Vault | `deleteZone` | Supprime le chemin de secrets de la zone |
| `post` | Keycloak | `deleteZone` | Supprime le client OIDC de la zone |

### 3.5 `upsertCluster` / `deleteCluster` (Hook<ClusterObject>)

**Déclencheur:** Création/suppression d'un cluster

| Hook | Étape | Plugin | Fonction | Description |
|------|-------|--------|----------|-------------|
| `upsertCluster` | `main` | ArgoCD | `upsertCluster` | *(cluster management)* |
| `upsertCluster` | `post` | GitLab | `commitFiles` | Commit des fichiers cluster |
| `deleteCluster` | `main` | ArgoCD | `deleteCluster` | *(cluster cleanup)* |
| `deleteCluster` | `post` | GitLab | `commitFiles` | Commit des fichiers supprimés |

**Note:** Vault expose une API sur `upsertCluster`/`deleteCluster` mais aucun plugin ne s'enregistre en étape sur ces hooks.

### 3.6 `upsertAdminRole` / `deleteAdminRole` (Hook<AdminRole>)

| Hook | Étape | Plugin | Description |
|------|-------|--------|-------------|
| `upsertAdminRole` | `main` | GitLab | Synchronise les membres admin/auditeur dans GitLab |
| `upsertAdminRole` | `main` | Keycloak | Synchronise les membres dans le groupe OIDC Keycloak |
| `deleteAdminRole` | `post` | Keycloak | Retire les membres du groupe OIDC |
| `deleteAdminRole` | `main` | GitLab | Désactive les flags admin/auditeur dans GitLab |

### 3.7 `upsertProjectRole` / `deleteProjectRole` (Hook<ProjectRole>)

| Hook | Étape | Plugin | Description |
|------|-------|--------|-------------|
| `upsertProjectRole` | `main` | Keycloak | Crée le sous-groupe OIDC pour le rôle |
| `deleteProjectRole` | `post` | Keycloak | Supprime le sous-groupe OIDC |

### 3.8 `upsertProjectMember` / `deleteProjectMember` (Hook<ProjectMember>)

| Hook | Étape | Plugin | Description |
|------|-------|--------|-------------|
| `upsertProjectMember` | `main` | GitLab | Synchronise les membres dans les groupes GitLab |
| `upsertProjectMember` | `main` | Keycloak | Synchronise les membres et leurs rôles dans les groupes Keycloak |
| `deleteProjectMember` | `post` | GitLab | Retire le membre du groupe GitLab |
| `deleteProjectMember` | `post` | Keycloak | Retire le membre de tous les groupes projet Keycloak |

### 3.9 Hooks divers (`hook-misc.ts`)

| Hook | Type | Plugin | Étape | Description |
|------|------|--------|-------|-------------|
| `checkServices` | `EmptyPayload` | — | — | Vérification de santé des services (aucun plugin enregistré actuellement) |
| `getProjectSecrets` | `ProjectLite` | GitLab | `main` | Récupère les secrets GitLab (mirror token, pipeline trigger) |
| `getProjectSecrets` | `ProjectLite` | Harbor | `main` | Récupère les secrets Harbor (robot credentials) |
| `getProjectSecrets` | `ProjectLite` | Nexus | `main` | Récupère les secrets Nexus |
| `getProjectSecrets` | `ProjectLite` | Vault | `main` | Récupère les secrets Vault (mount path) |
| `syncRepository` | `UniqueRepo` | GitLab | `main` | Déclenche le miroir d'un dépôt GitLab |
| `syncRepository` | `UniqueRepo` | GitLab | `post` | Commit des fichiers post-sync |

### 3.10 `retrieveUserByEmail` (Hook<UserEmail>)

| Hook | Étape | Plugin | Description |
|------|-------|--------|-------------|
| `retrieveUserByEmail` | `main` | Keycloak | Recherche un utilisateur par email dans Keycloak |

---

## 4. Matrice de dépendances entre plugins

Cette matrice montre **qui appelle qui** via `payload.apis.<plugin>` :

```
Appelant → Appelé    │ GitLab │ Vault │ Keycloak │ Harbor │ Nexus │ SonarQube │ ArgoCD
─────────────────────┼────────┼───────┼──────────┼────────┼───────┼───────────┼───────
GitLab               │   —    │ READ/ │    —     │   —    │  —    │     —     │  —
                     │        │ WRITE │          │        │       │           │
ArgoCD               │  READ  │ READ  │   READ   │   —    │  —    │     —     │  —
                     │  (API) │ (API) │  (API)   │        │       │           │
Harbor               │   —    │ READ  │   READ   │   —    │  —    │     —     │  —
                     │        │ (API) │  (API)   │        │       │           │
SonarQube            │  READ  │ READ/ │   READ   │   —    │  —    │     —     │  —
                     │  (API) │ WRITE │  (API)   │        │       │           │
Keycloak             │   —    │ WRITE │    —     │   —    │  —    │     —     │  ─
(upsertZone)         │        │       │          │        │       │           │
Vault                │   —    │   —   │    —     │   —    │  —    │     —     │  —
Nexus                │   —    │   —   │    —     │   —    │  —    │     —     │  —
```

### 4.1 Problèmes identifiés (dette technique)

1. **GitLab gère les fichiers de tout le monde** — ArgoCD commite des fichiers values.yaml dans les dépôts infra GitLab. GitLab commite aussi des fichiers post-opération. Il n'y a pas de contrat clair sur "qui possède quels fichiers".

2. **Vault est un fournisseur de secrets passif** — Les plugins lisent/écrivent dans Vault sans contrat formalisé. GitLab écrit `GITLAB` secrets, SonarQube écrit `SONAR` secrets, Keycloak écrit `keycloak` secrets. Pas de namespace strict.

3. **Keycloak expose une API mais ArgoCD ne l'utilise que pour les groupes d'env** — L'API `KeycloakProjectApi` est principalement utilisée par ArgoCD et SonarQube pour récupérer les chemins de groupes OIDC.

4. **Pas de contrat d'interface explicite** — Les APIs sont typées via module augmentation TypeScript (`declare module '@cpn-console/hooks' { interface HookPayloadApis { ... } }`), mais il n'y a pas de documentation contractuelle ni de validation à l'exécution.

5. **Le plugin Nexus n'a pas de `functions.ts`** — La logique est dans `project.js` directement, ce qui est une incohérence structurelle.

6. **Le hook `checkServices` n'est utilisé par aucun plugin** — Le monitoring est fait via le champ `monitor` de chaque plugin, pas via le hook.

---

## 5. Recommandations

### 5.1 Court terme (PIP plugins)

1. **Documenter les contrats d'API** — Formaliser les interfaces `GitlabProjectApi`, `VaultProjectApi`, `KeycloakProjectApi` avec des contrats explicites (préconditions, postconditions, erreurs attendues)

2. **Isoler la gestion des fichiers GitLab** — Définir clairement quels plugins peuvent commiter dans quels dépôts. Envisager un service de "file commit" centralisé.

3. **Namespacer les secrets Vault** — Adopter une convention stricte : `<PLUGIN>/<RESOURCE>` (ex: `gitlab/mirror`, `sonar/token`, `keycloak/client-secret`)

### 5.2 Moyen terme

4. **Introduire un mécanisme de "ownership"** — Chaque ressource externe (dépôt, secret, groupe) devrait avoir un propriétaire clair qui est le seul à la modifier.

5. **Valider les APIs à l'enregistrement** — Quand un plugin expose une API, vérifier qu'elle implémente l'interface attendue.

6. **Unifier la structure des plugins** — Tous les plugins devraient avoir `functions.ts` comme point d'entrée des hooks (Nexus est actuellement incohérent).

---

## 6. Annexe : Types de données partagés

### 6.1 Hook arguments

| Type | Fichier | Champs clés |
|------|---------|-------------|
| `Project` | `hook-project.ts` | `id, name, slug, description, status, clusters[], environments[], repositories[], users[], roles[], store, owner` |
| `ProjectLite` | `hook-misc.ts` | `id, name, store, slug` |
| `ClusterObject` | `index.ts` | `id, label, privacy, clusterResources, infos, cluster, user, zone` |
| `ZoneObject` | `index.ts` | `id, slug, label, argocdUrl, clusterNames?` |
| `Environment` | `hook-project.ts` | `id, name, clusterId, cpu, gpu, memory, stage, autosync, permissions[]` |
| `Repository` | `hook-project.ts` | `id, internalRepoName, externalRepoUrl, isPrivate, isInfra, deployRevision, deployPath, helmValuesFiles` |
| `UserObject` | `index.ts` | `firstName, lastName, id, email` |
| `AdminRole` | `hook-admin-role.ts` | `id, name, permissions, position, oidcGroup, members[]` |
| `ProjectRole` | `hook-project-role.ts` | `id, name, permissions, projectId, position, type?, oidcGroup?` |
| `ProjectMember` | `hook-project-member.ts` | `userId, email, firstName, lastName, roles[], project` |
| `UniqueRepo` | `hook-misc.ts` | `ProjectLite` + `repo: Repository & { syncAllBranches, branchName? }` |

### 6.2 Hook result

```typescript
interface PluginResult {
  status: { result: 'OK' | 'KO' | 'WARNING', message?: string }
  store?: Record<string, string | number | null>
  executionTime?: Record<string, number>
  error?: unknown
  // Extensions par plugin (module augmentation):
  secrets?: Record<string, string>        // GitLab, Harbor, Nexus, Vault
  secretsDestroyed?: number               // Vault
  errors?: Partial<Record<HookStepsNames, unknown>>  // SonarQube
  warnReasons?: string[]                  // GitLab
}
```
