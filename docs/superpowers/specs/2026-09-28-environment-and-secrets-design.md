# Gestion des environnements et secrets — conception

**Ticket :** #2125

**Statut :** conception validée, en attente de revue du document

## Contexte

La Console mélange aujourd'hui configuration et secrets dans de nombreux fichiers `.env*`, chargés différemment par les applications, Docker Compose, Prisma, les scripts et la CI. La PR #2187 est un PoC ancien : elle ne doit pas être prolongée telle quelle (Node 24/pnpm 10, alors que le dépôt impose Node 26/pnpm 11).

La cible est `mise` pour les outils, tâches et variables publiques, et `fnox` pour les secrets. `pass` est le fournisseur local par défaut ; l'architecture doit toutefois permettre d'ajouter ou de remplacer des fournisseurs ultérieurement. En CI, les secrets restent fournis par GitHub Actions : `fnox` les résout depuis l'environnement du job et ne nécessite pas `pass`.

## Périmètre et contraintes

- Le périmètre est le dépôt `console`. Les charts Helm restent un consommateur externe du contrat de configuration.
- `apps/server` est gelé et ne doit pas être modifié. Ses `.env`, modèles, chargeurs et son `env_file` Compose sont conservés jusqu'à la suppression du legacy.
- Hors `apps/server`, aucun `.env*` ne subsiste, y compris les modèles. Aucun fichier d'environnement n'est généré.
- Les points d'entrée supportés sont des tâches `mise`, pas les appels directs à `pnpm` ou `docker compose`.
- Les secrets ne doivent pas entrer dans le shell ambiant, les fichiers, le bundle client ou les journaux.

## Architecture

### Configuration publique

`mise.toml` porte les versions imposées (Node 26, pnpm 11, fnox) et le profil local par défaut. Les fichiers versionnés `mise.<profil>.toml` portent les surcharges non sensibles des profils `docker`, `integ` et `ci`. Ils contiennent aussi les tâches de la stack.

L'inventaire initial classe chaque variable comme publique ou secrète, propriétaire et consommateur. Les valeurs publiques sont nommées par consommateur dans `mise` (`CLIENT_*`, `NESTJS_*`) puis traduites vers le contrat de chaque processus par sa tâche ou son service Compose : un nom comme `KEYCLOAK_CLIENT_ID` ne peut ainsi pas faire collision entre frontend et backend. Les valeurs locales sûres sont versionnées ; les surcharges personnelles non secrètes utilisent `mise.local.toml`, ignoré par Git. Toute valeur classée secrète est interdite dans `mise`.

### Secrets

`fnox.toml` définit chaque secret explicitement avec le fournisseur `password-store`, sous le préfixe `fnox/console/`, et `env = "exec"`. Les profils `fnox.<profil>.toml` remplacent les références de fournisseur lorsque nécessaire. Le profil CI déclare les mêmes noms sans fournisseur afin que les valeurs déjà injectées par GitHub Actions soient consommées ; les secrets requis échouent avec `if_missing = "error"`.

`mise run setup` vérifie les prérequis de `pass`/GPG et initialise, après confirmation explicite, les entrées de démonstration locales. Il ne crée aucun `.env` non legacy.

### Exécution

Chaque tâche non legacy invoque `fnox exec` :

| Cas | Point d'entrée | Sources |
| --- | --- | --- |
| Développement natif | `mise run dev`, puis tâches applicatives | profil local, `pass` |
| Docker local | `mise run docker:dev` | profil `docker`, `pass` |
| Intégration hybride/conteneurisée | `mise run integ` / `mise run docker:integ` | profil `integ`, `pass` |
| CI | tâches `mise` sous profil `ci` | configuration versionnée, secrets GitHub Actions |

Docker Compose reçoit par interpolation seulement les variables explicitement autorisées pour chaque service. Les services `client` et `server-nestjs` ne consomment plus de `env_file`; le service `server` conserve temporairement cette mécanique sans changement.

Le client reçoit une liste blanche de variables publiques. Vite ne doit jamais sérialiser `process.env` complet. Les valeurs destinées au navigateur demeurent publiques dans tous les modes, y compris l'image de production.

## Migration

1. Ajouter l'ADR, l'inventaire de variables, les configurations `mise`/`fnox` et les tâches de bootstrap. Documenter dans `ci/scripts/init-env.sh` qu'il ne sert plus qu'à `apps/server` et disparaîtra avec lui.
2. Migrer le client et `server-nestjs` : supprimer leurs chargeurs `.env`, modèles et scripts de génération ; injecter la configuration via les profils.
3. Adapter les compose locaux, Docker et integ : remplacer leurs `env_file` non legacy par des variables explicites ; conserver la voie legacy intacte.
4. Migrer lint, tests unitaires, builds et Playwright vers les tâches `mise` et le profil CI. Mettre à jour `ENVIRONMENTS.md` et le contrat pour les déploiements externes.
5. Lorsque le ticket de décommissionnement supprimera `apps/server`, supprimer ses derniers `.env*` et `ci/scripts/init-env.sh`.

## Vérification

- `fnox check --if-missing error` précède chaque tâche nécessitant des secrets.
- Des tests de configuration valident la sélection des profils, les variables requises et la liste blanche client.
- Chaque profil est validé par `mise`, `fnox` et `docker compose config` avec des valeurs de test.
- La CI exécute lint, tests unitaires, build et Playwright via `mise`; seuls les jobs legacy continuent d'initialiser ses `.env*`.
- Un contrôle statique interdit tout `.env*` hors de `apps/server` pendant la transition.
