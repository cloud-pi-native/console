# Console Cloud π Native

## Prérequis

Liste des outils utilisés par le projet à installer sur son ordinateur :

- Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Install [Docker Compose Plugin](https://docs.docker.com/compose/install/)
- Install [Nodejs](https://nodejs.org/en/download/)
- Install [Pnpm](https://pnpm.io/installation)

## Architecture

Ce projet est construit avec [NodeJS](https://nodejs.org/), [VueJS](https://vuejs.org/), [Postgres](https://www.postgresql.org/) & [Docker](https://www.docker.com/).

### Liste des services docker

| Nom du service  | Github                                             | Role                                      | Utilisé en production |
| --------------- | -------------------------------------------------- | ----------------------------------------- | --------------------- |
| __postgres__    | [Postgres](https://github.com/postgres/postgres)   | Base de données de l'application          | Oui                   |
| __pgadmin__     | [Pgadmin](https://github.com/pgadmin-org/pgadmin4) | Interface d'administration de Postgres    | -                     |
| __server__      | [NodeJS](https://github.com/nodejs/node)           | API de l'application                      | Oui                   |
| __ansible-api__ | [NodeJS](https://github.com/nodejs/node)           | API wrapper d'Ansible                     | Oui                   |
| __client__      | [VueJS](https://github.com/vuejs/vue)              | Interface graphique de l'application      | Oui                   |
| __keycloak__    | [Keycloak](https://github.com/keycloak/keycloak)   | Gestionnaire d'authentification / d'accès | -                     |
| __cypress__     | [Cypress](https://github.com/cypress-io/cypress)   | Tests de bout en bout                     | -                     |

### Architecture du dépôt

La gestion des dépendances est effectuée à l'aide de [pnpm](https://pnpm.io/) selon la structure de dossiers suivante :

- Les différentes briques applicatives se trouvent dans le dossier `apps/`
- Les bibliothèques additionnelles se trouvent dans le dossier `packages/`

*Schema de l'architecture du monorepo :*

```shell
├── apps
│   ├── ansible-api/
│   ├── client/
│   └── server/
├── packages
│   ├── test-utils/
│   └── shared/
├── node_modules/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
 ...
```

## Développement

Lancez les commandes suivantes dans votre terminal :

```shell
# Cloner le projet
git clone https://github.com/dnum-mi/dso-console.git

# Se rendre dans le dossier du projet
cd dso-console

# Installer les dépendances du projet
pnpm install

# Copier les fichiers d'exemples
./ci/scripts/init-env.sh

# Construire les images docker
pnpm run dev:build

# Lancer l'application en mode développement
pnpm run dev
```

De nombreuses commandes sont disponible dans le fichier `package.json` à la racine du projet, vous pouvez lancer ces dernières à l'aide de la commande `pnpm run <le_nom_du_script>`.

### Accès aux services

Interface graphique (Client): <http://localhost:8080>

Serveur (API) <http://localhost:4000>

Wrapper ansible (API) <http://localhost:8100>

Interface d'administration de base de données: <http://localhost:8081>

Interface d'administration du serveur keycloak: <http://localhost:8090>

## Gestion des conteneurs docker

Ce dépôt utilise des fichiers docker-compose, ils sont listés dans le dossier `./docker/` en tant que `docker-compose.*.yml` :

- [docker-compose.dev.yml](./ci/docker/docker-compose.dev.yml) pour le mode développement
- [docker-compose.ct.yml](./ci/docker/docker-compose.ct.yml) pour les tests de composant sans interface graphique
- [docker-compose.e2e.yml](./ci/docker/docker-compose.e2e.yml) pour les tests e2e avec interface graphique
- [docker-compose.ci.yml](./ci/docker/docker-compose.ci.yml) pour les tests e2e sans interface graphique
- [docker-compose.prod.yml](./ci/docker/docker-compose.prod.yml) pour la construction des images docker

## Contributions

Les commits doivent suivre la spécification des [Commits Conventionnels](https://www.conventionalcommits.org/en/v1.0.0/), il est possible d'ajouter l'[extension VSCode](https://github.com/vivaxy/vscode-conventional-commits) pour faciliter la création des commits.

Une PR doit être faite avec une branche à jour avec la branche develop en rebase (et sans merge) avant demande de fusion, et la fusion doit être demandée dans develop.

## Configuration du Keycloak

Pour pouvoir gérer les droits utilisateurs des services le pod `server` doit accèder aux groupes des users. Cela signifie modifier le clientScope `profile`:  
* Onglet `Mappers`
* `Add Mappers` -> `By configuration` -> `Group Membership`
  * Name: `groups`
  * Token Claim Name: `groups`
  * Full group path: `Off`
  * Add to ID token: `On`
  * Add to access token: `On`
  * Add to userinfo: `Off`

En environnement de dev l'import par défaut prévoit déjà la modification