# nginx-strangler

Reverse proxy dédié à la migration progressive du backend `server` (Fastify/legacy) vers `server-nestjs` (NestJS), selon le [Strangler Fig Pattern](https://martinfowler.com/bliki/StranglerFigApplication.html).

Ticket de référence : [#1885](https://github.com/cloud-pi-native/console/issues/1885)

---

## Architecture

```
[Client nginx :8080]
       │ proxy_pass → nginx-strangler:8080
       ▼
[nginx-strangler :8080]
       ├── /api/[routes migrées]  ──→  server-nestjs:3001
       └── /api/[tout le reste]   ──→  server:8080 (legacy)
```

---

## Variables d'environnement

| Variable | Description | Exemple Docker | Exemple local |
|---|---|---|---|
| `LEGACY_UPSTREAM` | Adresse du backend Fastify legacy | `server:8080` | `host.docker.internal:4001` |
| `NESTJS_UPSTREAM` | Adresse du backend NestJS | `server-nestjs:3001` | `host.docker.internal:3001` |

Ces variables sont substituées dans `conf.d/routing.conf` via `envsubst` au démarrage du conteneur.

---

## Basculer une route vers NestJS

Éditer `conf.d/routing.conf` et ajouter un bloc `location` **avant** le bloc fallback `/api/`, en respectant le format suivant :

```nginx
# [Vague X - nom-du-module] AAAA-MM-JJ
location = /api/v1/ma-route {
    proxy_pass         http://server-nestjs;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```

Puis recharger nginx sans downtime :

```bash
docker compose exec nginx-strangler nginx -t      # valider la config
docker compose exec nginx-strangler nginx -s reload
```

### Modificateurs de location

| Modificateur | Usage |
|---|---|
| `=` | Route exacte (ex: `GET /api/v1/system/health`) |
| `^~` | Préfixe prioritaire (ex: tout un module `/api/v1/users/`) |
| *(aucun)* | Préfixe standard |

---

## Rollback d'une route

En cas de problème sur une route basculée :

```bash
# 1. Dans conf.d/routing.conf, commenter le bloc concerné :
#    # [Vague X - module] AAAA-MM-JJ  ← ROLLBACK AAAA-MM-JJ
#    # location = /api/v1/xxx { ... }

# 2. Recharger nginx sans downtime
docker compose exec nginx-strangler nginx -s reload

# 3. Vérifier les logs
docker compose logs -f nginx-strangler | grep "/api/v1/xxx"
```

---

## Lancer en dev local (pnpm dev)

Quand `server` et `server-nestjs` tournent nativement (hors Docker), le `nginx-strangler` reste lui en Docker avec des upstreams pointant vers `host.docker.internal` :

```bash
# Dans docker/docker-compose.local.yml, le service nginx-strangler utilise :
# LEGACY_UPSTREAM=host.docker.internal:4001
# NESTJS_UPSTREAM=host.docker.internal:3001

docker compose -f docker/docker-compose.local.yml up nginx-strangler
```

---

## Vérification de la configuration

```bash
# Tester la syntaxe (depuis l'hôte)
docker compose exec nginx-strangler nginx -t

# Voir la config résolue (après substitution envsubst)
docker compose exec nginx-strangler cat /etc/nginx/conf.d/routing.conf

# Logs en temps réel
docker compose logs -f nginx-strangler
```

---

## Liens

- Plan de mise en place : [`server-nestjs/documentation/mise-en-place-nginx-etrangleur/PLAN.md`](../server-nestjs/documentation/mise-en-place-nginx-etrangleur/PLAN.md)
- Stratégie de modularisation : [`server-nestjs/documentation/Modularisation-de-console-server/01-MODULARISATION-STRATEGIE.md`](../server-nestjs/documentation/Modularisation-de-console-server/01-MODULARISATION-STRATEGIE.md)
- Cartographie des modules : [`server-nestjs/documentation/Modularisation-de-console-server/MODULARISATION-CARTOGRAPHIE.md`](../server-nestjs/documentation/Modularisation-de-console-server/MODULARISATION-CARTOGRAPHIE.md)
