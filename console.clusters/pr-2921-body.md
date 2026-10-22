# Pourquoi

L'audit du 23 octobre 2026 de #1889 confirme que les 7 routes sous `/api/v1/clusters` atteignent encore `apps/server` via nginx-strangler. Elles doivent être déléguées à `server-nestjs`.

## Ce qui a été fait

Ajout d'un bloc `location /api/v1/clusters` dans `apps/nginx-strangler/conf.d/routing.conf` qui route vers `server-nestjs`.

Les 7 méthodes/chemins V1 clusters sont servis par NestJS via nginx-strangler, sans passage par le legacy :
- `GET /api/v1/clusters` (liste)
- `GET /api/v1/clusters/:clusterId` (détails)
- `GET /api/v1/clusters/usage/:clusterId` (usage)
- `GET /api/v1/clusters/:clusterId/environments` (environnements)
- `POST /api/v1/clusters` (création)
- `PUT /api/v1/clusters/:clusterId` (mise à jour)
- `DELETE /api/v1/clusters/:clusterId` (suppression)

## Vérification

- Diff exact : `apps/nginx-strangler/conf.d/routing.conf`, +10 lignes (bloc `location` ajouté + 1 ligne de séparation).
- La syntaxe suit le modèle existant de `apps/nginx-strangler/conf.d/routing.conf` (indentation, `proxy_pass`, headers `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`).
- Contrôle de routage : le contrôleur existe dans `server-nestjs` (`cluster/cluster.controller.ts`) et le module `ClusterModule` est importé dans `MainModule`.
- `nginx -t` n'a pas pu être exécuté dans cet environnement (nginx non installé) ; la validation doit être faite localement avant merge.

## Références

- #1889 — audit et suivi de la bascule complète
- #2492 (portage clos)
- #2495 (portage fusionné)
- #2756 (bascule fusionnée vers une branche intermédiaire)
- Issue de demande : #2931
