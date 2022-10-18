# Console Cloud PI Native

## Prérequis

Liste des outils utilisés par le projet à installer sur son ordinateur :

- Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Install [Docker Compose Plugin](https://docs.docker.com/compose/install/)
- Install [Nodejs](https://nodejs.org/en/download/)
- Install [Pnpm](https://pnpm.io/installation)

## Architecture

Ce projet est construit avec [NodeJS](https://nodejs.org/), [VueJS](https://vuejs.org/), [Postgres](https://www.postgresql.org/) & [Docker](https://www.docker.com/).

### Liste des services docker

| Nom du service | Github                                             | Role                                      | Utilisé en production |
| -------------- | -------------------------------------------------- | ----------------------------------------- | --------------------- |
| __postgres__   | [Postgres](https://github.com/postgres/postgres)   | Base de données de l'application          | Oui                   |
| __pgadmin__    | [Pgadmin](https://github.com/pgadmin-org/pgadmin4) | Interface d'administration de Postgres    | -                     |
| __server__     | [NodeJS](https://github.com/nodejs/node)           | API de l'application                      | Oui                   |
| __client__     | [VueJS](https://github.com/vuejs/vue)              | Interface graphique de l'application      | Oui                   |
| __keycloak__   | [Keycloak](https://github.com/keycloak/keycloak)   | Gestionnaire d'authentification / d'accès | -                     |
| __cypress__    | [Cypress](https://github.com/cypress-io/cypress)   | Tests de bout en bout                     | -                     |

## Développement

Lancez les commandes suivantes dans votre terminal :

```shell
# Cloner le projet
git clone https://github.com/dnum-mi/dso-console.git

# Se rendre dans le dossier du projet
cd dso-console

# Installer les dépendances du projet
pnpm install

# Construire les images docker
pnpm run dev:build

# Lancer l'application en mode développement
pnpm run dev
```

### Accès aux services

Interface graphique (Client): <http://localhost:8080>

Serveur (API) <http://localhost:4000>

Interface d'administration de base de données: <http://localhost:8081>

## Gestion des conteneurs docker

Ce dépôt utilise des fichiers docker-compose, ils sont listés dans le dossier `./docker/` en tant que `docker-compose.*.yml` :

- [docker-compose.dev.yml](./ci/docker/docker-compose.dev.yml) pour le mode développement
- [docker-compose.e2e.yml](./ci/docker/docker-compose.test.yml) pour les tests e2e
- [docker-compose.prod.yml](./ci/docker/docker-compose.prod.yml) pour la production
