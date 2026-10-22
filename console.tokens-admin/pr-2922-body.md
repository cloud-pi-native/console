# Pourquoi

L'audit du 23 octobre 2026 de #1889 confirme que les 3 routes `/api/v1/admin/tokens` atteignent encore `apps/server` via nginx-strangler. Elles doivent être déléguées à `server-nestjs`.

## Ce qui a été fait

Ajout d'un bloc `location /api/v1/admin/tokens` dans `apps/nginx-strangler/conf.d/routing.conf` qui route vers `server-nestjs`.

Les méthodes `GET`, `POST` et `DELETE` de `/api/v1/admin/tokens` sont servies par NestJS via nginx-strangler, sans passage par le legacy.

## Vérification

- Diff exact : `apps/nginx-strangler/conf.d/routing.conf`, +10 lignes (bloc `location` ajouté + 1 ligne de séparation).
- La syntaxe suit le modèle existant de `apps/nginx-strangler/conf.d/routing.conf` (indentation, `proxy_pass`, headers `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`).
- Contrôle de routage : le contrôleur existe dans `server-nestjs` (`admin-token/admin-token.controller.ts`) et le module `AdminTokenModule` est importé dans `MainModule`.
- `nginx -t` n'a pas pu être exécuté dans cet environnement (nginx non installé) ; la validation doit être faite localement avant merge.

## Références

- #1889 — audit et suivi de la bascule complète
- #2719 (portage clos)
- #2740 (portage fusionné)
- Issue de demande : #2930
