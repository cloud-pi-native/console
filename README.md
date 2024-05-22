# Console Cloud π Native

La console Cloud π Native est une application web ayant pour but de piloter des services web dans un cluster Kubernetes afin de fournir une platefome cloud qui accompagne les produits numériques lors de toutes les phases de leur cycle de vie.

Cette console offre une interface unifiée vers un ensemble de services tout en garantissant une cohérence globale du système avec la création automatique d'un certain nombre de ressources comme par exemple les comptes d'accès, les robots ou encore des ressources Kubernetes. 
En addition du provisionnement automatique, elle garantit aussi le contrôle d'accès aux ressources du projet à l'aide d'une gestion d'équipe, de permissions, de quotas, etc...

## Architecture

Ce projet est construit avec [NodeJS](https://nodejs.org/), [VueJS](https://vuejs.org/), [Postgres](https://www.postgresql.org/) et [Keycloak](https://www.keycloak.org/). 
Le serveur et le client sont livrés sous forme d'images [Docker](https://www.docker.com/) et sont déployées à l'aide de [Helm](https://helm.sh/) dans [Kubernetes](https://kubernetes.io/).

### Liste des services kubernetes

| Nom du service | Github project                                                                  | Role                                      | Déployé avec le Helm Chart de production |
| -------------- | ------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| __client__     | [VueJS](https://github.com/vuejs/vue) / [Nginx](https://github.com/nginx/nginx) | Interface graphique de l'application      | Oui                                      |
| __server__     | [NodeJS](https://github.com/nodejs/node)                                        | API de l'application                      | Oui                                      |
| __postgres__   | [Postgres](https://github.com/postgres/postgres)                                | Base de données de l'application          | Oui                                      |
| __keycloak__   | [Keycloak](https://github.com/keycloak/keycloak)                                | Gestionnaire d'authentification / d'accès | -                                        |
| __pgadmin__    | [Pgadmin](https://github.com/pgadmin-org/pgadmin4)                              | Interface d'administration de Postgres    | -                                        |

### API

Le serveur est construit selon une architecture __core / plugins__ pour favoriser l'évolutivité et l'ajout de nouvelles fonctionnalités / la gestion de nouveaux services. Pour ce faire, les plugins s'enregistrent auprès de différents `hooks` (qui suivent le cycle de vie d'un projet au sein de l'application), ces derniers seront déclenchés par les contrôleurs de l'application.

Plusieurs plugins sont nativement enregistrés auprès du serveur pour assurer le bon fonctionnement de la plateforme, à savoir :

- [Argocd](https://argo-cd.readthedocs.io/en/stable/)
- [Gitlab](https://about.gitlab.com/)
- [Harbor](https://goharbor.io/)
- [Keycloak](https://www.keycloak.org/)
- [Kubernetes](https://kubernetes.io/)
- [Nexus](https://www.sonatype.com/products/sonatype-nexus-repository)
- [Sonarqube](https://www.sonarsource.com/products/sonarqube/)
- [Vault](https://www.vaultproject.io/)

> Pour plus d'informations sur le développement d'un plugin, voir :
>   - [documentation des plugins](./misc/plugins.md).
>   - [documentation du module hooks](./packages/hooks/README.md).
>   - [exemple de plugin](https://github.com/cloud-pi-native/console-plugin-helloworld).

## Développement

Le développement s'effectue à l'aide de Docker *(le client et le serveur peuvent tourner en local ou dans Docker)* ou encore directement dans un cluster Kubernetes à l'aide de Kind, un outil permettant de créer des noeuds Kubernetes dans des conteneurs Docker.

### Prérequis

Liste des outils utilisés par le projet à installer sur son ordinateur :

- [Docker](https://docs.docker.com/get-docker/) *- moteur d'exécution de conteneur*
  - [Plugin compose](https://github.com/docker/compose) *- define and run multi-container applications with Docker*
  - [Plugin buildx](https://github.com/docker/buildx) *- Docker CLI plugin for extended build capabilities with BuildKit*
- [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) *- kubernetes dans Docker*
- [Kubectl](https://kubernetes.io/fr/docs/tasks/tools/install-kubectl/) *- interface en ligne de commande pour kubernetes*
- [Helm](https://helm.sh/docs/intro/install/) *- gestionnaire de paquets kubernetes*
- [Nodejs](https://nodejs.org/en/download/) *- environnement d'exécution javascript*
- [Pnpm](https://pnpm.io/installation) *- gestionnaire de paquets pour javascript*

> Pour une meilleure expérience développeur, il est recommandé :
>   - de gérer les versions de Nodejs avec [Volta](https://volta.sh/).
>   - de lancer les commandes Nodejs à l'aide de [Ni](https://github.com/antfu/ni).

### Lancer l'application

Lancez les commandes suivantes dans votre terminal pour installer le projet :

```shell
# Cloner le projet
git clone https://github.com/cloud-pi-native/console.git

# Se rendre dans le dossier du projet
cd console

# Installer les dépendances du projet
pnpm install

# Copier les fichiers d'environnement exemples
./ci/scripts/init-env.sh

# Construire les paquets applicatifs
pnpm build
```

#### Développement

L'application peut se lancer de plusieurs manières, à savoir :

__Local :__

```shell
# Lancer keycloak, postgres et pgadmin dans des conteneurs
pnpm run dev

# Lancer le serveur
pnpm --filter server run dev

# Lancer le client
pnpm --filter client run dev

# Supprimer les conteneurs keycloak, postgres et pgadmin
pnpm run dev:clean

# Supprimer les conteneurs keycloak, postgres et pgadmin (supprime les volumes docker)
pnpm run dev:delete
```

__Docker :__

```shell
# Lancer l'application
pnpm run docker:dev

# Supprimer les conteneurs
pnpm run docker:dev:clean

# Supprimer les conteneurs (supprime les volumes docker)
pnpm run docker:dev:delete
```

> Pour lancer le debugger nodejs sur le serveur, dans les fichiers `docker-compose` remplacer la directive  `command: ["dev"]` par `command: ["debug"]`.

__Kubernetes :__

```shell
# Initialiser Kind (ajoute des noms de domaines dans /etc/hosts, le mot de passe sera demandé)
pnpm run kube:init

# Lancer l'application
pnpm run kube:dev

# Supprimer les ressources applicatives sans supprimer le cluster Kind
pnpm run kube:clean

# Supprimer entièrement le cluster et ses ressources
pnpm run kube:delete
```

#### Intégration

L'application peut se lancer de plusieurs manières, à savoir :

__Local :__

```shell
# Lancer keycloak, postgres et pgadmin dans des conteneurs
pnpm run integ

# Lancer le serveur
pnpm --filter server run integ

# Lancer le client
pnpm --filter client run integ

# Supprimer les conteneurs keycloak, postgres et pgadmin
pnpm run integ:clean

# Supprimer les conteneurs keycloak, postgres et pgadmin (supprime les volumes docker)
pnpm run integ:delete
```

__Docker :__

```shell
# Lancer l'application
pnpm run docker:integ

# Supprimer les conteneurs
pnpm run docker:integ:clean

# Supprimer les conteneurs (supprime les volumes docker)
pnpm run docker:integ:delete
```

__Kubernetes :__

```shell
# Initialiser Kind (ajoute des noms de domaines dans /etc/hosts, le mot de passe sera demandé)
pnpm run kube:init

# Lancer l'application en mode développement
pnpm run kube:integ

# Supprimer les ressources applicatives sans supprimer le cluster Kind
pnpm run kube:clean

# Supprimer entièrement le cluster et ses ressources
pnpm run kube:delete
```

#### Utilitaires

Les commandes utilitaires de l'application :

```shell
# Lancer la vérification syntaxique
pnpm run lint

# Lancer les tests unitaires
pnpm run test

# Lancer les tests de composants
pnpm run test:ct

# Lancer les tests de bout en bout
pnpm run test:e2e
```

L'intégralité des commandes est disponibles dans le fichier [package.json](./package.json) à la racine du projet, vous pouvez lancer ces dernières à l'aide de la commande `pnpm run <le_nom_du_script>`.

### Accès aux services

Les services sont disponibles via des nom de domaines ajouté dans le fichier `/etc/hosts` de votre système, l'ajout des domaines se fait automatiquement lors de la commande `pnpm run kube:init`.

| Service                                        | Url (kubernetes)               | Url (local/docker)      |
| ---------------------------------------------- | ------------------------------ | ----------------------- |
| Interface graphique *- (client)*               | <http://console.dso.local>     | <http://localhost:8080> |
| Serveur *- (api)*                              | <http://console.dso.local/api> | <http://localhost:4000> |
| Interface d'administration de base de données  | <http://pgadmin.dso.local>     | <http://localhost:8081> |
| Interface d'administration du serveur keycloak | <http://keycloak.dso.local>    | <http://localhost:8090> |

*__Notes:__ :warning: Il est possible que le navigateur utilisé (particulière Brave ou Firefox) bloque les cookies utilisés entre le frontend et keycloak, il est nécessaire de désactiver les protections de ce type dans votre navigateur (ex: Brave Shield).*

### Informations de connexion

Les comptes utilisés pendant le développement sont les suivants :

| Service            | Nom d'utilisateur | Mot de passe |
| ------------------ | ----------------- | ------------ |
| Keycloak *(admin)* | `admin`           | `admin`      |
| Keycloak *(user)*  | `test`            | `test`       |
| PgAdmin            | `admin@dso.fr`    | `admin`      |
| Postgres           | `admin@dso.fr`    | `admin`      |

> La liste complète des comptes Keycloak pré-créés est disponible [ici](./keycloak/realms/realm-dev.json).

> Le nom de la base de données est : `dso-console-db`.

### Variables d'environnements

__Local / Docker:__

Les variables d'environnements sont gérées localement via des fichiers `.env` (local) / `.env.docker` (docker) dans les dossiers `./apps/server` et `./apps/client`, aux précédents fichiers s'ajoute un fichier `.env.integ` utilisé pour le mode intégration (local et docker).

__Kubernetes :__

Un chart Helm utilitaire est installé pour déployer les services qui ne sont pas inclus dans le chart de la console :

- Pgadmin

> Ces services sont personnalisables [ici](./ci/helm-utils/values.yaml).

Différents fichiers de `values.yml` sont disponibles pour personnaliser le déploiement de l'application dans le cluster Kind:

- Le fichier [./ci/kind/env/dso-values.yaml](./ci/kind/env/dso-values.yaml) contient les variables de base l'application.
- Le fichier [./ci/kind/env/dso-values-dev.yaml](./ci/kind/env/dso-values-dev.yaml) contient les variables de l'application pour le mode développement.
- Le fichier [./ci/kind/env/dso-values-int-example.yaml](./ci/kind/env/dso-values-int-example.yaml) contient les variables de l'application pour le mode intégration.

> *__Notes:__*
> - *Un fichier d'environnement `./env/.env` est disponible pour fournir le chemin d'accès vers la `kubeconfig` du cluster d'intégration.*
> - *Les values du chart de la console sont disponibles [ici](https://github.com/cloud-pi-native/helm-charts/tree/main/charts/dso-console).*

### Base de données

Pour faciliter les opérations de migrations de base de données via [Prisma](https://www.prisma.io/), un script est disponible :

```shell
# Lancer le script
pnpm --filter server run db:wrapper

# Voir l'aide du script
pnpm --filter server run db:wrapper -h
```

### Construction des images

Ce dépôt utilise des fichiers docker-compose pour construire les images docker:

- [docker-compose.dev.yml](./ci/docker/docker-compose.dev.yml) pour la construction des images docker du mode développement.
- [docker-compose.prod.yml](./ci/docker/docker-compose.prod.yml) pour la construction des images docker du mode production.

## Configuration du Keycloak

Pour pouvoir gérer les droits utilisateurs des services le pod `server` doit accéder aux groupes des users. Cela signifie modifier le clientScope `profile`:  

- Onglet `Mappers`
- `Add Mappers > By configuration > Group Membership`
  - Name: `groups`
  - Token Claim Name: `groups`
  - Full group path: `off`
  - Add to ID token: `on`
  - Add to access token: `on`
  - Add to userinfo: `off`

> En environnement de dev l'import par défaut prévoit déjà cette modification.

Les utilisateurs faisant parti du group `admin` ont également accès à l'interface administrateur de la console une fois connectés via un onglet supplémentaire `Administration` dans le menu latéral de l'application.

## Tableau des ressources, terminologie

| Console Cloud Pi | Projet                       | Environnement | Dépots                                  | Utilisateur / membre |
| ---------------- | ---------------------------- | ------------- | --------------------------------------- | -------------------- |
| __Openshift__    |                              | Namespace     |                                         |                      |
| __ArgoCD__       |                              |               | (infra) Secret, AppProject, Application |                      |
| __Gitlab__       | Group                        |               | Repository (Dépôt)                      | User                 |
| __Harbor__       | Project                      |               | Repository [1]                          |                      |
| __Keycloak__     |                              | Group         |                                         | User / member        |
| __Sonar__        | User                         |               |                                         |                      |
| __Nexus__        | Repositories, role, user ... |               |                                         |                      |

[1] N'est pas crée par la console mais par le produit de la CI

## Architecture du dépôt

La gestion des dépendances est effectuée à l'aide de [pnpm](https://pnpm.io/) selon la structure de dossiers suivante :

- Les différentes briques applicatives se trouvent dans le dossier `apps/`.
- Les bibliothèques additionnelles se trouvent dans le dossier `packages/`.
- Les plugins core se trouvent dans le dossier `plugins/`.

*Schema de l'architecture du monorepo :*

```shell
./
├── apps
│   ├── client
│   └── server
├── packages
│   ├── eslintconfig
│   ├── hooks
│   ├── shared
│   ├── test-utils
│   └── tsconfig
├── plugins
│   ├── argocd
│   ├── gitlab
│   ├── harbor
│   ├── keycloak
│   ├── kubernetes
│   ├── nexus
│   ├── sonarqube
│   └── vault
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## Gestion du contrôle de versions

Le dépôt utilise [Release Please](https://github.com/google-github-actions/release-please-action) pour automatiquement générer les tags Git ainsi que les releases GitHub. À chaque fois que du code est poussé dans la branche `main`, une pull request est créée en analysant les messages de commits pour déterminer le numéro de version à créer.

À chaque fois qu'une pull request de release est fusionnée, les images de conteneur du serveur et du client sont créées et hébergées dans la [registry Github associée au dépôt](https://github.com/orgs/cloud-pi-native/packages?repo_name=console).

Pour publier les versions des modules npm du dépôt un [pipeline](https://github.com/cloud-pi-native/console/actions/workflows/npm.yml) est disponible dans les GitHub Actions, il analysera les numéros de version présents dans les différents fichiers `package.json` pour déterminer si une nouvelle version du module doit être créée et publiée.

> Il est possible de créer une version de pré-release d'un module npm en modifiant la clé `publishConfig.tag` dans le `package.json` avec par exemple `beta` pour générer une version beta.

### Version des dépendances Helm

La console embarque une dépendance avec le Helm Chart utilisé par ArgoCD pour consommer le fichier values qu'elle construit. Afin d'assurer la compatibilité, il faut toujours que la version du Helm chart associé ait été publiée au préalable (voir [la documentation dédiée](https://github.com/cloud-pi-native/helm-charts?tab=readme-ov-file#contribution)).

## Conventions

Cf. [Conventions - MIOM Fabrique Numérique](https://docs.fabrique-numerique.fr/conventions/nommage.html).

> Les commits restent néanmoins rédigés en anglais.

## Contributions

Les commits doivent suivre la spécification des [Commits Conventionnels](https://www.conventionalcommits.org/en/v1.0.0/), il est possible d'ajouter l'[extension VSCode](https://github.com/vivaxy/vscode-conventional-commits) pour faciliter la création des commits.

Une PR doit être faite avec une branche à jour avec la branche `develop` en rebase (et sans merge) avant demande de fusion, et la fusion doit être demandée dans `develop`.
