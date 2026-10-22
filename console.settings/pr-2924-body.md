# Pourquoi

L'audit du 23 octobre 2026 de #1889 confirme que cette route atteint encore `apps/server` via nginx-strangler. Elle doit être déléguée à `server-nestjs`.

## Ce qui a été fait

Ajout d'un bloc `location /api/v1/system/settings` dans `apps/nginx-strangler/conf.d/routing.conf` qui route vers `server-nestjs`.

Les deux méthodes `GET` et `POST` de `/api/v1/system/settings` sont servies par NestJS via nginx-strangler, sans passage par le legacy.

## Vérification

- Diff exact : `apps/nginx-strangler/conf.d/routing.conf`, +10 lignes (bloc `location` ajouté + 1 ligne de séparation).
- La syntaxe suit le modèle existant de `apps/nginx-strangler/conf.d/routing.conf` (indentation, `proxy_pass`, headers `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`).
- Contrôle de routage : le contrôleur existe dans `server-nestjs` (`system-settings.controller.ts`) et le module `SystemSettingsModule` est importé dans `MainModule`.
- `nginx -t` n'a pas pu être exécuté dans cet environnement (nginx non installé) ; la validation doit être faite localement avant merge.

## Références

- #1889 — audit et suivi de la bascule complète
- #2208 (portage système clos)
- #2722 et #2734 (garde d'écriture corrigée)
- Issue de demande : #2928
