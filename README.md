# Console Cloud π Native

## Prérequis

Liste des outils utilisés par le projet à installer sur son ordinateur :

- Install [Docker](https://docs.docker.com/get-docker/)
- Install [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- Install [Kubectl](https://kubernetes.io/fr/docs/tasks/tools/install-kubectl/)
- Install [Helm](https://helm.sh/docs/intro/install/)
- Install [Nodejs](https://nodejs.org/en/download/)
- Install [Pnpm](https://pnpm.io/installation)

> *Pour la gestion des versions de Nodejs, il est recommandé d'utiliser [Volta](https://volta.sh/).*

## Architecture

Ce projet est construit avec [NodeJS](https://nodejs.org/), [VueJS](https://vuejs.org/), [Postgres](https://www.postgresql.org/) et construit sous forme d'images [Docker](https://www.docker.com/) pour être déployé via Helm dans Kubernetes.

### Liste des services docker

| Nom du service | Github project                                                                  | Role                                      | Utilisé en production |
| -------------- | ------------------------------------------------------------------------------- | ----------------------------------------- | --------------------- |
| __postgres__   | [Postgres](https://github.com/postgres/postgres)                                | Base de données de l'application          | Oui                   |
| __pgadmin__    | [Pgadmin](https://github.com/pgadmin-org/pgadmin4)                              | Interface d'administration de Postgres    | -                     |
| __server__     | [NodeJS](https://github.com/nodejs/node)                                        | API de l'application                      | Oui                   |
| __client__     | [VueJS](https://github.com/vuejs/vue) / [Nginx](https://github.com/nginx/nginx) | Interface graphique de l'application      | Oui                   |
| __keycloak__   | [Keycloak](https://github.com/keycloak/keycloak)                                | Gestionnaire d'authentification / d'accès | -                     |


### Architecture du dépôt

La gestion des dépendances est effectuée à l'aide de [pnpm](https://pnpm.io/) selon la structure de dossiers suivante :

- Les différentes briques applicatives se trouvent dans le dossier `apps/`
- Les bibliothèques additionnelles se trouvent dans le dossier `packages/`

*Schema de l'architecture du monorepo :*

```shell
├── apps
│   ├── client/
│   └── server/
├── packages
│   ├── test-utils/
│   ├── tsconfig/
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
git clone https://github.com/cloud-pi-native/console.git

# Se rendre dans le dossier du projet
cd console

# Installer les dépendances du projet
pnpm install

# Copier les fichiers d'environnement exemples
./ci/scripts/init-env.sh

# Initialiser Kind (ajoute des noms de domaines dans /etc/hosts, le mot de passe sera demandé)
pnpm run kube:init

# Lancer l'application en mode développement
pnpm run dev
```

De nombreuses commandes sont disponible dans le fichier `package.json` à la racine du projet, vous pouvez lancer ces dernières à l'aide de la commande `pnpm run <le_nom_du_script>`.

### Base de données

Pour faciliter les opérations de migrations de base de données via [Prisma](https://www.prisma.io/), un script est disponible :

```sh
# Lancer le script
pnpm --filter server run db:wrapper

# Voir l'aide du script
pnpm --filter server run db:wrapper -h
```

### Accès aux services

Interface graphique (Client): <http://localhost:8080>

Serveur (API) <http://localhost:4000>

Interface d'administration de base de données: <http://localhost:8081>

Interface d'administration du serveur keycloak: <http://localhost:8090>

### Variables d'environnements

Un chart Helm utilitaire est installé pour déployer les services qui ne sont pas inclus dans le chart de la console :
- Keycloak
- Pgadmin

> *Ces services sont personnalisables [ici](./ci/helm/utils/values.yaml).*

Différents fichiers de `values.yml` sont disponibles pour personnaliser le déploiement de l'application dans le cluster Kind:
- Le fichier [env/dso-values-dev.yaml](./env/dso-values-dev.yaml) contient les variables de l'application pour le mode développement.
- Le fichier [env/dso-values.yaml](./env/dso-values.yaml) contient les variables de l'application pour le mode production.
- Le fichier [env/dso-values-int-example.yaml](./env/dso-values-int-example.yaml) contient les variables de l'application pour le mode intégration.

## Gestion des conteneurs docker

Ce dépôt utilise des fichiers docker-compose pour construire les images docker:

- [docker-compose.dev.yml](./ci/docker/docker-compose.dev.yml) pour la construction des images docker du mode développement.
- [docker-compose.prod.yml](./ci/docker/docker-compose.prod.yml) pour la construction des images docker du mode production.

## Configuration du Keycloak

Pour pouvoir gérer les droits utilisateurs des services le pod `server` doit accéder aux groupes des users. Cela signifie modifier le clientScope `profile`:  
* Onglet `Mappers`
* `Add Mappers > By configuration > Group Membership`
  * Name: `groups`
  * Token Claim Name: `groups`
  * Full group path: `off`
  * Add to ID token: `on`
  * Add to access token: `on`
  * Add to userinfo: `off`

> En environnement de dev l'import par défaut prévoit déjà cette modification.

Les utilisateurs faisant parti du group `admin` ont également accès à l'interface administrateur de la console une fois connectés via un onglet supplémentaire `Administration` dans le menu latéral de l'application.


## Tableau des ressources, terminologie
| Console Cloud Pi | Projet                       | Environnement | Dépots                                  | Utilisateur / membre |
| ---------------- | ---------------------------- | ------------- | --------------------------------------- | -------------------- |
| **Openshift**    |                              | Namespace     |                                         |                      |
| **ArgoCD**       |                              |               | (infra) Secret, AppProject, Application |                      |
| **Gitlab**       | Group                        |               | Repository (Dépôt)                      | User                 |
| **Harbor**       | Project                      |               | Repository [1]                          |                      |
| **Ldap**         | Group                        |               |                                         | User / memberof      |
| **Keycloak**     |                              | Group         |                                         | User / member        |
| **Sonar**        | User                         |               |                                         |                      |
| **Nexus**        | Repositories, role, user ... |               |                                         |                      |

[1] N'est pas crée par la console mais par le produit de la CI

## Contributions

Les commits doivent suivre la spécification des [Commits Conventionnels](https://www.conventionalcommits.org/en/v1.0.0/), il est possible d'ajouter l'[extension VSCode](https://github.com/vivaxy/vscode-conventional-commits) pour faciliter la création des commits.

Une PR doit être faite avec une branche à jour avec la branche develop en rebase (et sans merge) avant demande de fusion, et la fusion doit être demandée dans develop.