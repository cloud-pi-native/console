# Plan : Nginx "étrangleur" pour la transition `server` → `server-nestjs`

> Ticket de référence : [#1885](https://github.com/cloud-pi-native/console/issues/1885)
> PR en cours : [#1951](https://github.com/cloud-pi-native/console/pull/1951) — branche `add-server-nextjs-to-local-dev`
> Dernière mise à jour : 2026-02-26

---

## Contexte et état des lieux

| Élément | État |
|---|---|
| `server` (Fastify) | Port `8080` interne, exposé `4000` sur l'hôte |
| Nginx actuel | Embarqué dans l'image `client`, proxifie `/api` + `/swagger-ui` vers `server:8080` — upstream changé vers `nginx-strangler:8080` |
| `server-nestjs` | Dockerisé (port `3001`), ajouté dans tous les docker-compose |
| `nginx-strangler` | Service dédié créé dans `apps/nginx-strangler/`, fallback total sur `server` legacy |
| Envs couverts | Local dev, docker-compose (dev/prod/ci/integ) |

---

## Architecture cible

```
[Navigateur / API client]
         │
         ▼
┌────────────────────┐
│  Client (8080)     │  ← nginx embarqué dans l'image client
│  nginx "front"     │     SPA + proxy /api → nginx-strangler
└────────┬───────────┘
         │ proxy_pass http://nginx-strangler:8080
         ▼
┌────────────────────┐
│  nginx-strangler   │  ← service dédié (port 8080 interne, non-root)
│  (routing as-code) │
└──────┬─────────────┘
       │
       ├── /api/[routes migrées]  ──→  server-nestjs:3001
       └── /api/[tout le reste]   ──→  server:8080 (legacy)
```

**Principe clé** : le nginx client existant reste inchangé dans son rôle SPA, mais son upstream `api` est redirigé vers `nginx-strangler` plutôt que directement vers `server`. Le `nginx-strangler` devient l'unique point de routage des appels API.

---

## Décisions structurantes

| Décision | Choix |
|---|---|
| Emplacement du nginx-strangler | Répertoire `apps/nginx-strangler/` à la racine du dépôt |
| Port interne de `nginx-strangler` | `8080` (non-root, Trivy DS002) |
| Port interne de `server-nestjs` | `3001` (distinct du legacy sur `8080`) |
| Envs PAX / MinInt | Couverts via docker-compose uniquement dans ce ticket |
| Config nginx | `envsubst` pour substituer les upstreams selon l'environnement |
| Rollback | Commenter une `location` dans `routing.conf` + `nginx -s reload` |
| Sécurité image nginx | `USER nginx`, `HEALTHCHECK`, `chown` sur les répertoires système nginx |
| Sécurité image server-nestjs | `USER node`, `HEALTHCHECK` sur le stage `prod` (Trivy DS026) |

---

## Découvertes en cours de réalisation

- Le nginx existant dans l'image `client` proxifiait directement vers `server:8080` — upstream changé vers `nginx-strangler:8080`
- `server-nestjs/src/main.ts` utilisait `process.env.PORT ?? 0` au lieu de `ConfigurationService.port` — corrigé
- Le schéma Prisma de `server-nestjs` est multi-fichiers dans `src/prisma/schema/` — `prisma generate` doit pointer sur le dossier, pas sur `schema.prisma`
- `docker-compose.prod.yml` avait un bug préexistant (`depends_on` vide sur `opencds-mockoon`) — corrigé au passage
- En CI (`job-lint.yml`), `nginx -t` échoue si `apt-get update -qq` n'est pas exécuté avant l'install, et si les chemins `pid`/`error_log`/`access_log` ne sont pas patchés vers `/tmp/` (runner non-root)
- En CI (`job-playwright.yml`), les images `server-nestjs:ci` et `nginx-strangler:ci` doivent être buildées localement avant le `docker compose up --no-build` (même pattern que `opencds-mockoon`)

---

## Phase 1 — Socle nginx-strangler ✅

### Tâche 1.1 : Créer `apps/nginx-strangler/` ✅

```
apps/nginx-strangler/
├── Dockerfile            # image nginx:1.27-alpine, USER nginx, HEALTHCHECK, EXPOSE 8080, envsubst entrypoint
├── nginx.conf            # directives globales (worker_processes, logs, include conf.d/)
├── conf.d/
│   ├── routing.conf      # fichier "vivant" des routes (commenté par vague de migration)
│   └── routing.local.conf.example  # template documentaire pour le mode local natif
└── README.md             # procédures opérationnelles (déploiement, rollback, ajout de route, dev local)
```

### Tâche 1.2 : Contenu initial de `routing.conf` ✅

Le fichier utilise des variables d'environnement substituées via `envsubst` pour permettre la réutilisation de la même image dans tous les contextes (Docker, local natif) :

```nginx
upstream server-legacy {
    server ${LEGACY_UPSTREAM};
}

upstream server-nestjs {
    server ${NESTJS_UPSTREAM};
}

server {
    listen 8080;

    # ── Routes migrées vers NestJS ──────────────────────────────────────────
    # Format : # [Vague X - Module] AAAA-MM-JJ
    # (vide au démarrage — toutes les routes sont en fallback sur server-legacy)

    # ── Fallback : tout le reste vers le server legacy ───────────────────────
    location /api/ {
        proxy_pass http://server-legacy;
        ...
    }

    location /swagger-ui {
        proxy_pass http://server-legacy;
        ...
    }
}
```

Exemple de bascule future (à ajouter au fil des vagues) :
```nginx
# [Vague 1 - system/health] 2026-03-XX
location = /api/v1/system/health {
    proxy_pass http://server-nestjs;
    ...
}
```

---

## Phase 2 — Dockerisation de `server-nestjs` ✅

### Tâche 2.1 : Fix du port dans `main.ts` ✅

`apps/server-nestjs/src/main.ts` utilisait `process.env.PORT ?? 0` — câblé sur `ConfigurationService.port`.

### Tâche 2.2 : Créer `apps/server-nestjs/Dockerfile` ✅

Multi-stage : `base` → `deps` → `build` → `prod`. `prisma generate --schema=src/prisma/schema` (dossier multi-fichiers). `USER node`, `HEALTHCHECK`, `EXPOSE 3001`.

### Tâche 2.3 : `apps/server-nestjs/.env.docker-example` ✅

`SERVER_PORT=3001` présent.

---

## Phase 3 — Mise à jour des docker-compose ✅

### Tâche 3.1 : `docker/docker-compose.dev.yml` ✅

Services `server-nestjs` (avec Docker Compose Watch) et `nginx-strangler` ajoutés. `client` dépend de `nginx-strangler`.

### Tâche 3.2 : `docker/docker-compose.prod.yml` ✅

Idem sans Watch. Bug `depends_on` vide sur `opencds-mockoon` corrigé.

### Tâche 3.3 : `docker/docker-compose.ci.yml` ✅

Idem prod.

### Tâche 3.4 : `docker/docker-compose.integ.yml` ✅

Idem dev (avec Watch) + volumes kubeconfig.

### Tâche 3.5 : `docker/docker-compose.local.yml` ✅

`nginx-strangler` ajouté avec `host.docker.internal`, port `8082:8080`, `extra_hosts: host-gateway`.

### Tâche 3.6 : `apps/client/nginx/default.docker.conf` ✅

Upstream `server:8080` → `nginx-strangler:8080`.

---

## Phase 4 — Dev local (pnpm dev natif) ✅

### Tâche 4.1 : Template de config pour le mode local ✅

`apps/nginx-strangler/conf.d/routing.local.conf.example` créé avec `host.docker.internal` comme valeurs d'exemple.

### Tâche 4.2 : Documentation ✅

- `ENVIRONMENTS.md` : refonte complète avec section Strangler Fig, `server-nestjs` mentionné partout, sous-section dédiée au geste manuel `SERVER_PORT=8082`
- `apps/client/.env-example` : note sur `SERVER_PORT=8082` pour passer par le nginx-strangler en local

Variables par contexte :

| Contexte | `LEGACY_UPSTREAM` | `NESTJS_UPSTREAM` |
|---|---|---|
| Docker (dev/prod/ci/integ) | `server:8080` | `server-nestjs:3001` |
| Local (pnpm dev) | `host.docker.internal:4000` | `host.docker.internal:3001` |
| PAX / MinInt | À adapter selon la topologie réseau |

---

## Phase 5 — Validation et outillage

### Tâche 5.1 : Validation `nginx -t` dans le CI ✅

Étape ajoutée dans `.github/workflows/job-lint.yml` :
- `apt-get update -qq` + install `nginx gettext-base`
- `envsubst` sur `routing.conf`
- `sed` pour patcher `user`, `pid`, `error_log`, `access_log` vers des chemins accessibles en non-root
- `nginx -t -c /tmp/nginx-test/nginx.conf`

### Tâche 5.2 : Smoke test ❌ (à faire)

Vérifier dans les tests Playwright que `/api/v1/system/health` répond correctement en passant par le nginx-strangler (et non plus directement par `server`).

### Tâche 5.3 : Procédure de rollback documentée ✅

Documentée dans `apps/nginx-strangler/README.md` :

```bash
# 1. Commenter la location concernée dans routing.conf
# 2. Recharger nginx sans downtime
docker compose exec nginx-strangler nginx -s reload
# 3. Vérifier les logs
docker compose logs -f nginx-strangler | grep /api/v1/xxx
```

### Tâche 5.4 (ajout) : Build des images CI dans job-playwright ✅

`docker buildx build -t dso-console/server-nestjs:ci` et `nginx-strangler:ci` ajoutés dans `.github/workflows/job-playwright.yml` avant le `docker compose up --no-build`.

---

## Critères d'acceptation

- [x] Le service `nginx-strangler` démarre correctement dans tous les docker-compose
- [x] Les appels `/api/*` continuent de fonctionner sans régression (fallback total sur `server`)
- [x] `nginx -t` passe en CI
- [x] La config est documentée et le format de bascule des routes est clairement défini
- [x] La procédure de rollback est documentée
- [x] Le dev local (`pnpm dev`) fonctionne avec le nginx-strangler en Docker
- [ ] Smoke test Playwright sur `/api/v1/system/health` via nginx-strangler

---

## Ce qui reste à faire (post-merge PR #1951)

1. **Tâche 5.2** : Smoke test Playwright (optionnel pour la PR courante, recommandé avant Vague 1)
2. **Vague 1** : Basculer les premiers modules dans `apps/nginx-strangler/conf.d/routing.conf` :
   - `system` (health, config, settings)
   - `admin-token`
   - `user/tokens`
   - `log`
   - Référence : [`MODULARISATION-CARTOGRAPHIE.md`](../Modularisation-de-console-server/MODULARISATION-CARTOGRAPHIE.md)

---

## Séquençage initial et estimation de charge

```
Phase 1 : Créer apps/nginx-strangler/ (structure + routing.conf)       Dev A  ~0.5j  ✅
Phase 2 : Dockeriser server-nestjs (Dockerfile + port)  Dev B  ~1j    ✅
           + Modifier upstream nginx client              Dev A  ~0.5h  ✅
Phase 3 : Mettre à jour tous les docker-compose         Dev A+B ~1j   ✅
Phase 4 : Config locale (envsubst + doc)                Dev A  ~0.5j  ✅
Phase 5 : CI + smoke test + rollback doc                Dev B  ~0.5j  🔄 (5.1 ✅, 5.2 ❌, 5.3 ✅)
─────────────────────────────────────────────────────────────────────
Total estimé                                                   ~3.5 j/p
```

---

## Liens

- Ticket GitHub : [#1885](https://github.com/cloud-pi-native/console/issues/1885)
- PR : [#1951](https://github.com/cloud-pi-native/console/pull/1951)
- Documentation Nginx strangler dans la stratégie de modularisation : [`01-MODULARISATION-STRATEGIE.md`](../Modularisation-de-console-server/01-MODULARISATION-STRATEGIE.md)
- Cartographie des modules (vagues de migration) : [`MODULARISATION-CARTOGRAPHIE.md`](../Modularisation-de-console-server/MODULARISATION-CARTOGRAPHIE.md)
- Suivi de l'avancement : [`MODULARISATION-STATUT.md`](../Modularisation-de-console-server/MODULARISATION-STATUT.md)
