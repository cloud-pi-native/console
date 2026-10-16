# ADR 0001 — mise et fnox pour la configuration et les secrets

## Statut

Proposé pour validation en séance plénière.

## Contexte

La Console mélange configuration et secrets dans des fichiers `.env*` lus par les applications, Docker Compose, Prisma et la CI. Les sources et les précédences diffèrent selon le mode d’exécution, rendant la configuration difficile à auditer et à reproduire.

## Décision

`mise` est l’unique point d’entrée supporté et fournit les outils, tâches et variables publiques. `fnox` injecte les secrets uniquement dans le processus enfant de `fnox exec`. Le fournisseur local par défaut est `pass`, sous `fnox/console/`. Les profils CI lisent uniquement les secrets nécessaires au processus qui les reçoit depuis GitHub Actions et n’installent pas `pass`.

Les fichiers `.env*` sont interdits hors de `apps/server`. Le legacy Fastify est gelé : ses fichiers, chargeurs et `env_file` Compose restent inchangés jusqu’à sa suppression du dépôt.

## Conséquences

Les appels directs à `pnpm` et `docker compose` ne sont plus des points d’entrée documentés. Le client ne reçoit qu’une liste blanche de variables publiques. Un changement de fournisseur fnox reste localisé aux profils fnox et ne change pas les tâches applicatives.

## Alternatives écartées

- Conserver les `.env*` : ne résout ni la multiplicité des sources, ni la confusion entre secrets et configuration.
- Nix et SecretSpec : alternative retenue seulement si `mise` et `fnox` ne répondent plus au besoin ; elle est hors périmètre de cette migration.
