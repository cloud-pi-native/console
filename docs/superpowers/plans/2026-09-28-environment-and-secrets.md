# Environment and Secrets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the client and NestJS `.env*` lifecycle with profile-based `mise` configuration and `fnox` secret injection, while retaining the frozen Fastify legacy path until its deletion.

**Architecture:** `mise.toml` owns pinned developer tools, public configuration and task entry points. Public `mise` variables are consumer-scoped (`CLIENT_*` and `NESTJS_*`) and each task/Compose service translates them to the application's existing contract, preventing frontend/backend value collisions. `fnox.toml` owns secret names and their providers; local profiles use `pass`, CI resolves already-injected GitHub Actions secrets. Docker Compose receives only explicit process variables for client/NestJS, while `apps/server` keeps its existing `.env*` and `env_file` unchanged.

**Tech Stack:** mise 2026.5.15+, fnox 1.36.0+, pass/GPG, pnpm 11.8.0, Node 26.7.0, Docker Compose, GitHub Actions, Vite, NestJS ConfigModule.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `docs/adr/0001-mise-fnox-environment-management.md` | Decision record to validate in plenary session. |
| `docs/environment-variables.md` | Single inventory: variable, classification, owner, consumer and profiles. |
| `mise.toml`, `mise.docker.toml`, `mise.integ.toml`, `mise.ci.toml` | Pinned tools, public values and supported tasks. |
| `fnox.toml`, `fnox.integ.toml`, `fnox.ci.toml` | Secret names, local `pass` references and CI environment-only overrides. |
| `scripts/bootstrap-secrets.sh` | Explicit, interactive creation of local fake secrets in `pass`. |
| `ci/scripts/init-env.sh` | Transitional legacy-only initializer; removed with `apps/server`. |
| `ci/scripts/check-environment-files.sh` | Rejects tracked `.env*` outside `apps/server`. |
| `apps/client/vite.config.ts` | Whitelists public dev-time client configuration. |
| `apps/server-nestjs/src/main.module.ts` and `prisma.config.ts` | Stop loading dotenv files. |
| `docker/docker-compose.{dev,integ,ci}.yml` | Explicitly injects only client/NestJS variables; leaves legacy `server` unchanged. |

## Invariant variable inventory

Create `docs/environment-variables.md` with the following classifications. A value absent from this table must not be added to `mise`, `fnox`, Compose, or a workflow without first extending the table.

| Classification | Variables |
| --- | --- |
| Public, common | `NODE_ENV`, `CI`, `APP_VERSION`, `SERVER_HOST`, `SERVER_PORT`, `NESTJS_SERVER_HOST`, `NESTJS_SERVER_PORT`, `CONTACT_EMAIL`, `PROJECTS_ROOT_DIR`, `LOG_LEVEL` |
| Public, client allowlist | `SERVER_HOST`, `SERVER_PORT`, `CLIENT_PORT`, `KEYCLOAK_PROTOCOL`, `KEYCLOAK_DOMAIN`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_REDIRECT_URI`, `OPENCDS_ENABLED`, `CONTACT_EMAIL` |
| Public, service endpoints/features | `USE_ARGOCD`, `USE_GITLAB`, `USE_NEXUS`, `USE_HARBOR`, `USE_SONARQUBE`, `USE_SERVICE_CHAIN`, `USE_VAULT`, `USE_OBSERVABILITY`, `ARGO_NAMESPACE`, `ARGOCD_URL`, `ARGOCD_INTERNAL_URL`, `ARGOCD_EXTRA_REPOSITORIES`, `ARGOCD_SHARED_SOURCE_REPOSITORIES`, `GITLAB_URL`, `GITLAB_INTERNAL_URL`, `GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS`, `GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS`, `HARBOR_URL`, `HARBOR_INTERNAL_URL`, `HARBOR_PROJECT_SLUG_CACHE_TTL_MS`, `HARBOR_RETENTION_CRON`, `HARBOR_ROBOT_EXPIRATION_DAYS`, `HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS`, `HARBOR_RULE_COUNT`, `HARBOR_RULE_TEMPLATE`, `NEXUS_URL`, `NEXUS_INTERNAL_URL`, `NEXUS__SECRET_EXPOSE_INTERNAL_URL`, `SONARQUBE_URL`, `SONARQUBE_INTERNAL_URL`, `GRAFANA_URL`, `DSO_OBSERVABILITY_CHART_VERSION`, `VAULT_URL`, `VAULT_INTERNAL_URL`, `VAULT_KV_NAME`, `VAULT__DEPLOY_VAULT_CONNECTION_IN_NS`, `OPENCDS_URL`, `OPENCDS_INTERNAL_URL`, `OPENCDS_API_TLS_REJECT_UNAUTHORIZED`, `DSO_ENV_CHART_VERSION`, `DSO_NS_CHART_VERSION`, `KUBECONFIG_HOST_PATH`, `KUBECONFIG_PATH`, `KUBECONFIG_CTX`, `EXTERNAL_PLUGINS_DIR_HOST_PATH` |
| Secrets | `SESSION_SECRET`, `DB_URL`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ADMIN`, `KEYCLOAK_ADMIN_PASSWORD`, `GITLAB_TOKEN`, `HARBOR_ADMIN`, `HARBOR_ADMIN_PASSWORD`, `NEXUS_ADMIN`, `NEXUS_ADMIN_PASSWORD`, `SONAR_API_TOKEN`, `VAULT_TOKEN`, `OPENCDS_API_TOKEN` |

`mise` stores a public value under its consumer prefix whenever the client and NestJS can differ. The task or Compose map translates `CLIENT_KEYCLOAK_CLIENT_ID` and `NESTJS_KEYCLOAK_CLIENT_ID`, for example, into the respective process-local `KEYCLOAK_CLIENT_ID` variable. `fnox` secret names retain the application contract because no frontend process receives them.

### Task 1: Establish the decision record, inventory, and legacy boundary

**Files:**
- Create: `docs/adr/0001-mise-fnox-environment-management.md`
- Create: `docs/environment-variables.md`
- Modify: `ci/scripts/init-env.sh`
- Modify: `ENVIRONMENTS.md`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write the ADR with the accepted and rejected decisions**

  Use this decision block verbatim in `docs/adr/0001-mise-fnox-environment-management.md`:

  ```markdown
  # ADR 0001 — mise et fnox pour la configuration et les secrets

  ## Statut

  Proposé pour validation en séance plénière.

  ## Décision

  `mise` est l'unique point d'entrée supporté et fournit les outils, tâches et variables publiques.
  `fnox` injecte les secrets uniquement dans le processus enfant de `fnox exec`.
  Le fournisseur local par défaut est `pass`, sous `fnox/console/`.
  Les profils CI lisent les secrets fournis par GitHub Actions et n'installent pas `pass`.
  Les fichiers `.env*` sont interdits hors de `apps/server` jusqu'à la suppression de ce legacy.

  ## Conséquences

  Les appels directs à `pnpm` et `docker compose` ne sont plus documentés comme points d'entrée.
  Le client ne reçoit qu'une liste blanche de variables publiques.
  Le changement de fournisseur fnox est localisé aux profils fnox, sans changer les tâches applicatives.
  ```

- [ ] **Step 2: Create the variable ledger from the invariant inventory**

  Add one row per variable in the inventory above, with columns `Variable`, `Classe`, `Propriétaire`, `Consommateurs`, `Profils`, and `Source`. Set source to `mise` for public values, `fnox/pass` for local secrets, and `GitHub Actions` for real CI secrets. Set owners to `client`, `server-nestjs`, `compose`, or `workflow` according to their consuming configuration.

- [ ] **Step 3: Make `init-env.sh` explicitly legacy-only without touching `apps/server`**

  Replace its discovery loop with the following code. It retains the non-destructive copy behavior but can only copy legacy templates:

  ```bash
  # Temporary bridge for the frozen Fastify legacy only.
  # Remove this script when apps/server is removed from the repository.
  find "$PROJECT_DIR/apps/server" -type f -name ".env*-example" -print0 | while IFS= read -r -d '' file; do
    target="${file/-example/}"
    if [ ! -f "$target" ]; then
      printf "\n${red}Copy${no_color}: '%s'\n${red}to${no_color}: '%s'\n" "$file" "$target"
      cp "$file" "$target"
    else
      printf "\nFile '%s' already exists\n" "$target"
    fi
  done
  ```

- [ ] **Step 4: Update user documentation without changing legacy instructions**

  In `ENVIRONMENTS.md`, replace the general generation section with a transition note: `ci/scripts/init-env.sh` exists solely for `apps/server`; all client/NestJS commands use `mise` and do not create `.env` files. In `README.md` and `AGENTS.md`, replace commands that instruct users to copy client/NestJS examples with `mise run setup`; retain the legacy exception exactly once in each document.

- [ ] **Step 5: Verify the documentation boundary**

  Run:

  ```bash
  rg -n 'init-env\.sh|\.env\*-example|mise run setup' ENVIRONMENTS.md README.md AGENTS.md ci/scripts/init-env.sh
  ```

  Expected: every `init-env.sh` reference says it is restricted to `apps/server`; no client or NestJS setup command copies an `.env` file.

- [ ] **Step 6: Commit the foundation decision**

  ```bash
  git add docs/adr docs/environment-variables.md ci/scripts/init-env.sh ENVIRONMENTS.md README.md AGENTS.md
  git commit -m "docs: define environment and secrets management"
  ```

### Task 2: Add `mise`/`fnox` profiles and secure local bootstrap

**Files:**
- Create: `mise.toml`
- Create: `mise.docker.toml`
- Create: `mise.integ.toml`
- Create: `mise.ci.toml`
- Create: `fnox.toml`
- Create: `fnox.integ.toml`
- Create: `fnox.ci.toml`
- Create: `scripts/bootstrap-secrets.sh`
- Modify: `.gitignore`
- Test: `scripts/bootstrap-secrets.sh`

- [ ] **Step 1: Write the failing profile-resolution checks**

  Before creating configuration files, run:

  ```bash
  test -f mise.toml
  test -f fnox.toml
  ```

  Expected: both commands exit non-zero because the repository has neither project configuration file.

- [ ] **Step 2: Create the root `mise.toml`**

  Create this baseline, using only public values and task wrappers:

  ```toml
  min_version = "2026.5.15"

  [tools]
  node = "26.7.0"
  pnpm = "11.8.0"
  fnox = "1.36.0"

  [env]
  NODE_ENV = "development"
  CLIENT_SERVER_HOST = "localhost"
  CLIENT_SERVER_PORT = "4000"
  CLIENT_PORT = "8080"
  CLIENT_KEYCLOAK_PROTOCOL = "http"
  CLIENT_KEYCLOAK_DOMAIN = "localhost:8090"
  CLIENT_KEYCLOAK_REALM = "dso"
  CLIENT_KEYCLOAK_CLIENT_ID = "dso-console-frontend"
  CLIENT_KEYCLOAK_REDIRECT_URI = "http://localhost:8080"
  CLIENT_OPENCDS_ENABLED = "false"
  CLIENT_CONTACT_EMAIL = "cloudpinative-relations@interieur.gouv.fr"
  NESTJS_SERVER_HOST = "localhost"
  NESTJS_SERVER_PORT = "3001"
  NESTJS_KEYCLOAK_PROTOCOL = "http"
  NESTJS_KEYCLOAK_DOMAIN = "localhost:8090"
  NESTJS_KEYCLOAK_REALM = "dso"
  NESTJS_KEYCLOAK_CLIENT_ID = "dso-console-backend"
  NESTJS_KEYCLOAK_REDIRECT_URI = "http://localhost:8080"
  NESTJS_CONTACT_EMAIL = "cloudpinative-relations@interieur.gouv.fr"

  [tasks.setup]
  run = "./ci/scripts/init-env.sh && ./scripts/bootstrap-secrets.sh"

  [tasks.dev]
  run = "docker compose -f docker/docker-compose.local.yml up -d --remove-orphans"

  [tasks.server-nestjs-dev]
  run = "SERVER_HOST=$NESTJS_SERVER_HOST SERVER_PORT=$NESTJS_SERVER_PORT KEYCLOAK_PROTOCOL=$NESTJS_KEYCLOAK_PROTOCOL KEYCLOAK_DOMAIN=$NESTJS_KEYCLOAK_DOMAIN KEYCLOAK_REALM=$NESTJS_KEYCLOAK_REALM KEYCLOAK_CLIENT_ID=$NESTJS_KEYCLOAK_CLIENT_ID KEYCLOAK_REDIRECT_URI=$NESTJS_KEYCLOAK_REDIRECT_URI CONTACT_EMAIL=$NESTJS_CONTACT_EMAIL fnox exec -- pnpm --filter server-nestjs run start:dev"

  [tasks.client-dev]
  run = "SERVER_HOST=$CLIENT_SERVER_HOST SERVER_PORT=$CLIENT_SERVER_PORT CLIENT_PORT=$CLIENT_PORT KEYCLOAK_PROTOCOL=$CLIENT_KEYCLOAK_PROTOCOL KEYCLOAK_DOMAIN=$CLIENT_KEYCLOAK_DOMAIN KEYCLOAK_REALM=$CLIENT_KEYCLOAK_REALM KEYCLOAK_CLIENT_ID=$CLIENT_KEYCLOAK_CLIENT_ID KEYCLOAK_REDIRECT_URI=$CLIENT_KEYCLOAK_REDIRECT_URI OPENCDS_ENABLED=$CLIENT_OPENCDS_ENABLED CONTACT_EMAIL=$CLIENT_CONTACT_EMAIL pnpm --filter client run dev"

  [tasks.lint]
  run = "pnpm lint"

  [tasks.test-unit]
  run = "fnox exec -- pnpm test"
  ```

  Keep `client-dev` outside `fnox exec`: the client accepts only public configuration.

- [ ] **Step 3: Create public profile overlays**

  Create `mise.docker.toml` with `DOCKER = "true"`, `CLIENT_SERVER_HOST = "nginx-strangler"`, `CLIENT_SERVER_PORT = "8080"`, `NESTJS_SERVER_HOST = "0.0.0.0"`, `NESTJS_SERVER_PORT = "3001"`, and `CLIENT_OPENCDS_ENABLED = "true"`. Create `mise.integ.toml` with `INTEGRATION = "true"`, `DEV_SETUP = "false"`, and no credential. Create `mise.ci.toml` with `CI = "true"`, `NODE_ENV = "production"`, `DEV_SETUP = "true"`, `FNOX_PROFILE = "ci"`, `CLIENT_SERVER_HOST = "nginx-strangler"`, `CLIENT_SERVER_PORT = "8080"`, `NESTJS_SERVER_HOST = "0.0.0.0"`, `NESTJS_SERVER_PORT = "3001"`, and the deterministic Keycloak/OpenCDS public endpoints used by `docker/docker-compose.ci.yml`.

  Add profile-selecting wrappers to root `mise.toml`:

  ```toml
  [tasks."docker:dev"]
  run = "mise -E docker run docker:dev-inner"

  [tasks."docker:dev-inner"]
  hide = true
  run = "fnox exec -- docker compose -f docker/docker-compose.dev.yml up -d --remove-orphans"

  [tasks.integ]
  run = "mise -E integ run integ-inner"

  [tasks.integ-inner]
  hide = true
  run = "fnox -P integ exec -- docker compose -f docker/docker-compose.local.yml up -d --remove-orphans postgres pgadmin"
  ```

- [ ] **Step 4: Create explicit fnox mappings**

  Create `fnox.toml` with no `default_provider`, so profile overlays can deliberately resolve secrets from an existing environment. It contains only the core local secret set, which every local NestJS command requires:

  ```toml
  #:schema https://fnox.jdx.dev/schema.json
  root = true
  env = "exec"
  if_missing = "error"

  [providers.pass]
  type = "password-store"
  prefix = "fnox/console/"

  [secrets]
  SESSION_SECRET = { provider = "pass", value = "local/SESSION_SECRET" }
  DB_URL = { provider = "pass", value = "local/DB_URL" }
  KEYCLOAK_CLIENT_SECRET = { provider = "pass", value = "local/KEYCLOAK_CLIENT_SECRET" }
  KEYCLOAK_ADMIN = { provider = "pass", value = "local/KEYCLOAK_ADMIN" }
  KEYCLOAK_ADMIN_PASSWORD = { provider = "pass", value = "local/KEYCLOAK_ADMIN_PASSWORD" }
  OPENCDS_API_TOKEN = { provider = "pass", value = "local/OPENCDS_API_TOKEN" }
  ```

  Create `fnox.integ.toml` with the integration-only pass references `GITLAB_TOKEN`, `HARBOR_ADMIN`, `HARBOR_ADMIN_PASSWORD`, `NEXUS_ADMIN`, `NEXUS_ADMIN_PASSWORD`, `SONAR_API_TOKEN`, and `VAULT_TOKEN`, all under `integ/<VARIABLE_NAME>`. It must not contain a plaintext secret.

  Create `fnox.ci.toml` with deterministic fixture overrides for the six core names:

  ```toml
  [secrets]
  SESSION_SECRET = { default = "a-very-strong-secret-with-more-than-32-char" }
  DB_URL = { default = "postgresql://admin:admin@postgres:5432/dso-console-db?schema=public" }
  KEYCLOAK_CLIENT_SECRET = { default = "client-secret-backend" }
  KEYCLOAK_ADMIN = { default = "admin" }
  KEYCLOAK_ADMIN_PASSWORD = { default = "admin" }
  OPENCDS_API_TOKEN = { default = "token" }
  ```

  The six defaults are deterministic test fixtures, not deployed credentials. `SONAR_*` and `ARGOCD_TOKEN` remain scoped to their current GitHub Actions steps; a future `mise` task that consumes one must declare a separate narrow fnox profile with provider-less entries for exactly its injected secret names.

- [ ] **Step 5: Add an interactive, idempotent local bootstrap**

  Implement `scripts/bootstrap-secrets.sh` so it fails when `pass` is unavailable, asks exactly once for confirmation, then calls `fnox set` only for absent local demo entries. Use this POSIX-safe loop:

  ```bash
  while IFS='|' read -r name value; do
    [ -n "$name" ] || continue
    fnox get "$name" >/dev/null 2>&1 || fnox set "$name" "$value" --provider pass
  done <<'SECRETS'
  SESSION_SECRET|a-very-strong-secret-with-more-than-32-char
  DB_URL|postgresql://admin:admin@localhost:5432/dso-console-db?schema=public
  KEYCLOAK_CLIENT_SECRET|client-secret-backend
  KEYCLOAK_ADMIN|admin
  KEYCLOAK_ADMIN_PASSWORD|admin
  OPENCDS_API_TOKEN|token
  SECRETS
  ```

- [ ] **Step 6: Protect personal overrides**

  Add these ignored paths:

  ```gitignore
  mise.local.toml
  mise.*.local.toml
  fnox.local.toml
  .fnox.local.toml
  ```

- [ ] **Step 7: Verify profiles without printing secrets**

  Run:

  ```bash
  mise tasks validate
  mise -E docker env | rg '^export (DOCKER|CLIENT_SERVER_HOST|CLIENT_SERVER_PORT)='
  fnox config-files
  fnox -P ci config-files
  fnox -P ci check --all
  ```

  Expected: task validation succeeds; Docker values are selected; fnox lists the expected profile files; the CI profile validates without `pass` and prints no secret value.

- [ ] **Step 8: Commit profiles and bootstrap**

  ```bash
  git add mise*.toml fnox*.toml scripts/bootstrap-secrets.sh scripts/bootstrap-secrets.spec.sh .gitignore
  git commit -m "feat: add mise and fnox environment profiles"
  ```

### Task 3: Remove NestJS dotenv loading and migrate its tests

**Files:**
- Delete: `apps/server-nestjs/.env-example`
- Delete: `apps/server-nestjs/.env.docker-example`
- Delete: `apps/server-nestjs/.env.integ-example`
- Delete: `apps/server-nestjs/src/utils/dotenv.utils.ts`
- Delete: `apps/server-nestjs/src/utils/dotenv.utils.spec.ts`
- Modify: `apps/server-nestjs/src/main.module.ts`
- Modify: `apps/server-nestjs/prisma.config.ts`
- Modify: all 17 files listed by `rg -l 'getDotenvPaths' apps/server-nestjs/test`
- Modify: `mise.toml` (NestJS test task with CI fixture injection)

- [ ] **Step 1: Write the failing no-dotenv regression check**

  Run:

  ```bash
  rg -n 'getDotenvPaths|loadEnvFile|parseEnv|\.env(\.docker|\.integ)?' apps/server-nestjs
  ```

  Expected before the migration: matches `main.module.ts`, `prisma.config.ts`, the utility and E2E module setups.

- [ ] **Step 2: Remove file loading from the NestJS application module**

  Replace the `ConfigModule.forRoot` call with:

  ```ts
  ConfigModule.forRoot({
    isGlobal: true,
    load: [baseConfigFactory],
  }),
  ```

  Remove the `getDotenvPaths` import.

- [ ] **Step 3: Make Prisma consume the current process environment only**

  Replace `apps/server-nestjs/prisma.config.ts` with:

  ```ts
  import path from 'node:path'
  import { defineConfig } from 'prisma/config'

  export default defineConfig({
    schema: path.join('src', 'prisma', 'schema'),
    migrations: {
      path: path.join('src', 'prisma', 'migrations'),
    },
  })
  ```

- [ ] **Step 4: Remove dotenv utility use in every NestJS E2E module**

  For each file returned by `rg -l 'getDotenvPaths' apps/server-nestjs/test`, remove the utility import and replace `ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [...] })` by `ConfigModule.forRoot({ isGlobal: true, load: [...] })`, preserving its existing `load` factories exactly.

- [ ] **Step 5: Delete templates and utility tests**

  Use `git rm` for the three NestJS templates and both dotenv utility files. Do not modify any path below `apps/server/`.

- [ ] **Step 6: Prove NestJS now needs process injection**

  Run:

  ```bash
  mise run server-nestjs:test
  rg -n 'getDotenvPaths|loadEnvFile|parseEnv|envFilePath: getDotenvPaths' apps/server-nestjs/src apps/server-nestjs/test || true
  ```

  Expected: tests pass with CI fixtures injected into the child process and the final search has no output.

- [ ] **Step 7: Commit the NestJS migration**

  ```bash
  git add apps/server-nestjs mise.toml docs/superpowers/plans/2026-09-28-environment-and-secrets.md
  git commit -m "refactor(server-nestjs): remove dotenv loading"
  ```

### Task 4: Whitelist client configuration and remove client dotenv files

**Files:**
- Delete: `apps/client/.env-example`
- Delete: `apps/client/.env.docker-example`
- Delete: `apps/client/.env.integ-example`
- Modify: `apps/client/vite.config.ts`
- Modify: `apps/client/nginx/entrypoint.sh`
- Test: `apps/client/vite.config.ts`

- [ ] **Step 1: Write the failing client confidentiality check**

  Run:

  ```bash
  rg -n "'process\.env': process\.env|loadEnvFile|\.env\.integ|\.env'" apps/client/vite.config.ts
  ```

  Expected before the migration: it finds both file loads and the full `process.env` serialization.

- [ ] **Step 2: Define a single public client object in Vite**

  Remove the `node:fs` import and both `process.loadEnvFile` blocks. Add this constant before `defineConfig`:

  ```ts
  const publicClientEnv = {
    NODE_ENV: process.env.NODE_ENV,
    SERVER_HOST: process.env.SERVER_HOST,
    SERVER_PORT: process.env.SERVER_PORT,
    CLIENT_PORT: process.env.CLIENT_PORT,
    KEYCLOAK_PROTOCOL: process.env.KEYCLOAK_PROTOCOL,
    KEYCLOAK_DOMAIN: process.env.KEYCLOAK_DOMAIN,
    KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_REDIRECT_URI: process.env.KEYCLOAK_REDIRECT_URI,
    OPENCDS_ENABLED: process.env.OPENCDS_ENABLED,
    CONTACT_EMAIL: process.env.CONTACT_EMAIL,
  }
  ```

  Keep production generic by retaining only `APP_VERSION` in the production `define` branch. Replace the development branch with `{ 'process.env': publicClientEnv }`.

- [ ] **Step 3: Keep runtime substitution aligned with the whitelist**

  In `apps/client/nginx/entrypoint.sh`, keep exactly the ten runtime names already consumed by `src/utils/env.ts`; add `CLIENT_PORT` only if it is added to the built runtime client code. Do not add any secret name. Add a comment above `ENV_VARS`: `# Browser-visible configuration only; never add a secret here.`

- [ ] **Step 4: Delete the client templates**

  ```bash
  git rm apps/client/.env-example apps/client/.env.docker-example apps/client/.env.integ-example
  ```

- [ ] **Step 5: Verify build and absence of secret exposure**

  Run:

  ```bash
  mise exec -- pnpm --filter client run build
  rg -n 'KEYCLOAK_CLIENT_SECRET|SESSION_SECRET|DB_URL|VAULT_TOKEN|GITLAB_TOKEN' apps/client docker || true
  ```

  Expected: the build succeeds; the final search has no result under `apps/client` or the client Docker configuration.

- [ ] **Step 6: Commit the client migration**

  ```bash
  git add apps/client
  git commit -m "refactor(client): remove dotenv configuration"
  ```

### Task 5: Inject client/NestJS Compose environments explicitly

**Files:**
- Modify: `docker/docker-compose.dev.yml`
- Modify: `docker/docker-compose.integ.yml`
- Modify: `docker/docker-compose.ci.yml`
- Test: `docker/docker-compose.dev.yml`
- Test: `docker/docker-compose.integ.yml`
- Test: `docker/docker-compose.ci.yml`

- [ ] **Step 1: Write failing rendered-Compose checks**

  Run:

  ```bash
  mise -E docker exec -- fnox exec -- docker compose -f docker/docker-compose.dev.yml config
  mise -E integ exec -- fnox -P integ exec -- docker compose -f docker/docker-compose.integ.yml config
  mise -E ci exec -- fnox -P ci exec -- docker compose -f docker/docker-compose.ci.yml config
  ```

  Expected before the migration: rendered configurations reference client and NestJS `env_file` paths.

- [ ] **Step 2: Define explicit environment maps for `server-nestjs`**

  In each compose file, remove only `server-nestjs.env_file` and set an `environment` mapping. Include the public and secret names consumed by its config factories. Required values use `${NAME:?NAME is required}`; optional values use `${NAME:-}`. The required core map begins:

  ```yaml
  environment:
    NODE_ENV: ${NODE_ENV:?NODE_ENV is required}
    CI: ${CI:-false}
    APP_VERSION: ${APP_VERSION:-unknown}
    SERVER_HOST: ${NESTJS_SERVER_HOST:-0.0.0.0}
    SERVER_PORT: ${NESTJS_SERVER_PORT:-3001}
    DB_URL: ${DB_URL:?DB_URL is required}
    SESSION_SECRET: ${SESSION_SECRET:?SESSION_SECRET is required}
    KEYCLOAK_PROTOCOL: ${KEYCLOAK_PROTOCOL:?KEYCLOAK_PROTOCOL is required}
    KEYCLOAK_DOMAIN: ${KEYCLOAK_DOMAIN:?KEYCLOAK_DOMAIN is required}
    KEYCLOAK_REALM: ${KEYCLOAK_REALM:?KEYCLOAK_REALM is required}
    KEYCLOAK_CLIENT_ID: ${KEYCLOAK_CLIENT_ID:?KEYCLOAK_CLIENT_ID is required}
    KEYCLOAK_CLIENT_SECRET: ${KEYCLOAK_CLIENT_SECRET:?KEYCLOAK_CLIENT_SECRET is required}
  ```

  Append this complete optional/plugin mapping after the core map; it is deliberately exhaustive so Compose never obtains an undeclared variable:

  ```yaml
    PROJECTS_ROOT_DIR: ${PROJECTS_ROOT_DIR:-}
    KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN:?KEYCLOAK_ADMIN is required}
    KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD is required}
    KEYCLOAK_ADMIN_CLIENT_ID: ${KEYCLOAK_ADMIN_CLIENT_ID:-admin-cli}
    KEYCLOAK_REDIRECT_URI: ${KEYCLOAK_REDIRECT_URI:?KEYCLOAK_REDIRECT_URI is required}
    KEYCLOAK_JWKS_CACHE_TTL_MS: ${KEYCLOAK_JWKS_CACHE_TTL_MS:-300000}
    KEYCLOAK_JWKS_TIMEOUT_MS: ${KEYCLOAK_JWKS_TIMEOUT_MS:-5000}
    KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS: ${KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS:-300000}
    ADMIN_KC_USER_ID: ${ADMIN_KC_USER_ID:-}
    CONTACT_EMAIL: ${CONTACT_EMAIL:?CONTACT_EMAIL is required}
    USE_ARGOCD: ${USE_ARGOCD:-false}
    ARGO_NAMESPACE: ${ARGO_NAMESPACE:-argocd}
    ARGOCD_URL: ${ARGOCD_URL:-}
    ARGOCD_INTERNAL_URL: ${ARGOCD_INTERNAL_URL:-}
    ARGOCD_EXTRA_REPOSITORIES: ${ARGOCD_EXTRA_REPOSITORIES:-}
    ARGOCD_SHARED_SOURCE_REPOSITORIES: ${ARGOCD_SHARED_SOURCE_REPOSITORIES:-}
    DSO_ENV_CHART_VERSION: ${DSO_ENV_CHART_VERSION:-dso-env-1.6.0}
    DSO_NS_CHART_VERSION: ${DSO_NS_CHART_VERSION:-dso-ns-1.1.5}
    USE_GITLAB: ${USE_GITLAB:-false}
    GITLAB_TOKEN: ${GITLAB_TOKEN:-}
    GITLAB_URL: ${GITLAB_URL:-}
    GITLAB_INTERNAL_URL: ${GITLAB_INTERNAL_URL:-}
    GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS: ${GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS:-365}
    GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS: ${GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS:-250}
    GITLAB__SECRET_EXPOSE_INTERNAL_URL: ${GITLAB__SECRET_EXPOSE_INTERNAL_URL:-false}
    USE_HARBOR: ${USE_HARBOR:-false}
    HARBOR_ADMIN: ${HARBOR_ADMIN:-}
    HARBOR_ADMIN_PASSWORD: ${HARBOR_ADMIN_PASSWORD:-}
    HARBOR_URL: ${HARBOR_URL:-}
    HARBOR_INTERNAL_URL: ${HARBOR_INTERNAL_URL:-}
    HARBOR_PROJECT_SLUG_CACHE_TTL_MS: ${HARBOR_PROJECT_SLUG_CACHE_TTL_MS:-300000}
    HARBOR_RETENTION_CRON: ${HARBOR_RETENTION_CRON:-0 22 2 * * *}
    HARBOR_ROBOT_EXPIRATION_DAYS: ${HARBOR_ROBOT_EXPIRATION_DAYS:-90}
    HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS: ${HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS:-60}
    HARBOR_RULE_COUNT: ${HARBOR_RULE_COUNT:-}
    HARBOR_RULE_TEMPLATE: ${HARBOR_RULE_TEMPLATE:-}
    USE_NEXUS: ${USE_NEXUS:-false}
    NEXUS_ADMIN: ${NEXUS_ADMIN:-}
    NEXUS_ADMIN_PASSWORD: ${NEXUS_ADMIN_PASSWORD:-}
    NEXUS_URL: ${NEXUS_URL:-}
    NEXUS_INTERNAL_URL: ${NEXUS_INTERNAL_URL:-}
    NEXUS__SECRET_EXPOSE_INTERNAL_URL: ${NEXUS__SECRET_EXPOSE_INTERNAL_URL:-false}
    USE_SONARQUBE: ${USE_SONARQUBE:-false}
    SONAR_API_TOKEN: ${SONAR_API_TOKEN:-}
    SONARQUBE_URL: ${SONARQUBE_URL:-}
    SONARQUBE_INTERNAL_URL: ${SONARQUBE_INTERNAL_URL:-}
    USE_VAULT: ${USE_VAULT:-false}
    VAULT_TOKEN: ${VAULT_TOKEN:-}
    VAULT_URL: ${VAULT_URL:-}
    VAULT_INTERNAL_URL: ${VAULT_INTERNAL_URL:-}
    VAULT_KV_NAME: ${VAULT_KV_NAME:-forge-dso}
    VAULT__DEPLOY_VAULT_CONNECTION_IN_NS: ${VAULT__DEPLOY_VAULT_CONNECTION_IN_NS:-false}
    USE_SERVICE_CHAIN: ${USE_SERVICE_CHAIN:-false}
    OPENCDS_URL: ${OPENCDS_URL:-}
    OPENCDS_INTERNAL_URL: ${OPENCDS_INTERNAL_URL:-}
    OPENCDS_API_TOKEN: ${OPENCDS_API_TOKEN:?OPENCDS_API_TOKEN is required}
    OPENCDS_API_TLS_REJECT_UNAUTHORIZED: ${OPENCDS_API_TLS_REJECT_UNAUTHORIZED:-true}
    USE_OBSERVABILITY: ${USE_OBSERVABILITY:-false}
    GRAFANA_URL: ${GRAFANA_URL:-}
    DSO_OBSERVABILITY_CHART_VERSION: ${DSO_OBSERVABILITY_CHART_VERSION:-dso-observability-0.1.7}
  ```

  Preserve the existing CI-only OpenCDS URLs, but express them through the `mise.ci.toml` inputs rather than inline Compose credentials.

- [ ] **Step 3: Define explicit public environment maps for `client`**

  Remove `client.env_file` in all three compose files. Inject only the public-client allowlist:

  ```yaml
  environment:
    SERVER_HOST: ${SERVER_HOST:?SERVER_HOST is required}
    SERVER_PORT: ${SERVER_PORT:?SERVER_PORT is required}
    CLIENT_PORT: ${CLIENT_PORT:-8080}
    KEYCLOAK_PROTOCOL: ${KEYCLOAK_PROTOCOL:?KEYCLOAK_PROTOCOL is required}
    KEYCLOAK_DOMAIN: ${KEYCLOAK_DOMAIN:?KEYCLOAK_DOMAIN is required}
    KEYCLOAK_REALM: ${KEYCLOAK_REALM:?KEYCLOAK_REALM is required}
    KEYCLOAK_CLIENT_ID: ${KEYCLOAK_CLIENT_ID:?KEYCLOAK_CLIENT_ID is required}
    KEYCLOAK_REDIRECT_URI: ${KEYCLOAK_REDIRECT_URI:?KEYCLOAK_REDIRECT_URI is required}
    OPENCDS_ENABLED: ${OPENCDS_ENABLED:-false}
    CONTACT_EMAIL: ${CONTACT_EMAIL:?CONTACT_EMAIL is required}
  ```

- [ ] **Step 4: Preserve the legacy bridge byte-for-byte**

  Do not edit the `server` service's `env_file` entries, its environment values, or the legacy template paths. This is the only Compose service allowed to retain an `.env*` reference.

- [ ] **Step 5: Verify no non-legacy `env_file` remains**

  Run:

  ```bash
  rg -n -U 'server-nestjs:|client:|env_file:' docker/docker-compose.{dev,integ,ci}.yml
  mise -E docker exec -- fnox exec -- docker compose -f docker/docker-compose.dev.yml config >/tmp/compose-dev.yml
  mise -E integ exec -- fnox -P integ exec -- docker compose -f docker/docker-compose.integ.yml config >/tmp/compose-integ.yml
  mise -E ci exec -- fnox -P ci exec -- docker compose -f docker/docker-compose.ci.yml config >/tmp/compose-ci.yml
  ```

  Expected: only the `server` service has `env_file`; all three render commands succeed without missing-variable warnings.

- [ ] **Step 6: Commit the Compose migration**

  ```bash
  git add docker/docker-compose.dev.yml docker/docker-compose.integ.yml docker/docker-compose.ci.yml
  git commit -m "refactor(docker): inject non-legacy environment explicitly"
  ```

### Task 6: Move CI jobs to `mise` and retain the legacy initializer only where needed

**Files:**
- Modify: `.github/workflows/job-lint.yml`
- Modify: `.github/workflows/job-tests-unit.yml`
- Modify: `.github/workflows/job-playwright.yml`
- Modify: `.github/workflows/job-npm.yml`
- Create: `ci/scripts/check-environment-files.sh`

- [ ] **Step 1: Write the failing file-boundary script invocation**

  Run before creating the script:

  ```bash
  ./ci/scripts/check-environment-files.sh
  ```

  Expected: fails with `No such file or directory`.

- [ ] **Step 2: Implement the tracked-file guard**

  Create `ci/scripts/check-environment-files.sh`:

  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  unexpected="$(git ls-files | grep -E '(^|/)\.env[^/]*$' | grep -v '^apps/server/\.env' || true)"
  if [ -n "$unexpected" ]; then
    printf 'Unexpected tracked environment files outside apps/server:\n%s\n' "$unexpected" >&2
    exit 1
  fi
  ```

  Mark it executable. The command deliberately uses tracked files: personal ignored files never enter CI.

- [ ] **Step 3: Replace Node/pnpm setup steps with the pinned mise action**

  In each of the four reusable jobs, after checkout add:

  ```yaml
  - name: Set up mise tools
    uses: jdx/mise-action@c2a87611a18de5b3828c5652fe268e992400cb5c # v4.3.0
    with:
      version: 2026.5.15
      install: true
      cache: true
  ```

  Remove `pnpm/action-setup` and `actions/setup-node` steps. Keep the existing pnpm-store cache until a measured follow-up proves it redundant.

- [ ] **Step 4: Run repository commands through tasks**

  Replace direct commands as follows:

  ```yaml
  # job-lint.yml
  - run: mise -E ci run lint
  - run: ./ci/scripts/check-environment-files.sh

  # job-tests-unit.yml
  - run: ./ci/scripts/init-env.sh
  - run: mise -E ci run test-unit

  # job-playwright.yml
  - run: ./ci/scripts/init-env.sh
  - run: mise -E ci run playwright-test
  ```

  Add `playwright-test` to `mise.ci.toml` as `run = "fnox exec -- pnpm --dir playwright exec playwright test --grep @e2e"`; `FNOX_PROFILE = "ci"` already selects CI fixture secrets. Retain the existing image-pull and Compose startup step before this task. Keep `init-env.sh` only in jobs that launch or test the legacy `server`; do not add it to lint or npm publishing.

- [ ] **Step 5: Keep GitHub secrets outside the generic CI profile**

  Keep the existing `SONAR_*`, `ARGOCD_TOKEN`, GitHub App, and Helm token declarations at their current job boundaries. `fnox.ci.toml` contains only deterministic test fixtures, so lint, unit tests and Playwright never resolve unrelated repository secrets. If a future `mise` task consumes a GitHub secret, create a dedicated fnox profile containing provider-less entries for exactly the values passed to that task; never export repository secrets globally with `GITHUB_ENV`.

- [ ] **Step 6: Validate workflows locally and in GitHub Actions**

  Run:

  ```bash
  mise -E ci run lint
  ./ci/scripts/check-environment-files.sh
  mise -E ci run test-unit
  ```

  Expected: each command exits 0. Then open a draft PR and confirm the lint, unit-test, build, scan and merge-queue checks all select Node 26.7.0 and pnpm 11.8.0 through mise.

- [ ] **Step 7: Commit the CI migration**

  ```bash
  git add .github/workflows ci/scripts/check-environment-files.sh
  git commit -m "ci: run environment-aware jobs through mise"
  ```

### Task 7: Finish migration documentation and execute the complete acceptance matrix

**Files:**
- Modify: `ENVIRONMENTS.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/environment-variables.md`

- [ ] **Step 1: Document supported commands and profiles**

  Add this command matrix to `ENVIRONMENTS.md`:

  ```markdown
  | Cas | Commande |
  | --- | --- |
  | Initialisation locale | `mise run setup` |
  | Infrastructure locale | `mise run dev` |
  | NestJS local | `mise run server-nestjs-dev` |
  | Client local | `mise run client-dev` |
  | Stack Docker locale | `mise run docker:dev` |
  | Intégration hybride | `mise run integ` |
  | CI | `mise -E ci run <tâche>` |
  ```

  State directly below the table that `apps/server` is the temporary and sole exception, and link to ADR 0001.

- [ ] **Step 2: Verify every documented command against its profile**

  Run in order:

  ```bash
  mise run setup
  mise run dev
  mise run server-nestjs-dev
  mise run client-dev
  mise run docker:dev
  mise run integ
  mise -E ci run lint
  mise -E ci run test-unit
  ```

  Stop each foreground development task after its readiness log. Expected: every command either starts its expected service or exits zero; none creates a client or NestJS `.env*` file.

- [ ] **Step 3: Run repository quality gates**

  ```bash
  mise exec -- pnpm format
  mise run lint
  mise run test-unit
  mise -E ci run playwright-test
  ```

  Expected: all gates pass. If a test needs real integration credentials, run it with `mise -E integ` and record the unavailable provider rather than substituting a secret.

- [ ] **Step 4: Verify the final source boundary**

  ```bash
  git ls-files | grep -E '(^|/)\.env[^/]*$' | sort
  rg -n 'loadEnvFile|parseEnv|getDotenvPaths|envFilePath' apps/client apps/server-nestjs || true
  rg -n 'env_file:' docker/docker-compose.{dev,integ,ci}.yml
  ```

  Expected: the first command lists only `apps/server/.env*-example`; the second command has no output; the third identifies only `server` service entries.

- [ ] **Step 5: Commit documentation and verification changes**

  ```bash
  git add ENVIRONMENTS.md README.md AGENTS.md docs/environment-variables.md
  git commit -m "docs: document mise environment workflows"
  ```

## Delivery notes

- Rebase the stale `use-mise` branch rather than reusing its Node 24/pnpm 10 configuration. Preserve PR #2187 only if its branch is rebased onto `origin/main`, its commit is replaced rather than amended, and its title/body are rewritten to the repository template; otherwise close it and open a new draft PR linked to #2125.
- Do not modify `apps/server` in any task. Its deletion is the sole trigger for removal of `ci/scripts/init-env.sh`, the legacy `.env*` files, and remaining legacy Compose `env_file` entries.
