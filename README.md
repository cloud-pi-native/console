# Console Cloud π Native

La console Cloud π Native est une application web ayant pour but de piloter des services web dans un cluster Kubernetes afin de fournir une platefome cloud lors du développement de produits numériques.


## Architecture

Ce projet est construit avec [NodeJS](https://nodejs.org/), [VueJS](https://vuejs.org/), [Postgres](https://www.postgresql.org/) et construit sous forme d'images [Docker](https://www.docker.com/) pour être déployé via [Helm](https://helm.sh/) dans [Kubernetes](https://kubernetes.io/).

### Liste des services kubernetes

| Nom du service | Github project                                                                  | Role                                      | Déployé en production |
| -------------- | ------------------------------------------------------------------------------- | ----------------------------------------- | --------------------- |
| __postgres__   | [Postgres](https://github.com/postgres/postgres)                                | Base de données de l'application          | Oui                   |
| __pgadmin__    | [Pgadmin](https://github.com/pgadmin-org/pgadmin4)                              | Interface d'administration de Postgres    | -                     |
| __server__     | [NodeJS](https://github.com/nodejs/node)                                        | API de l'application                      | Oui                   |
| __client__     | [VueJS](https://github.com/vuejs/vue) / [Nginx](https://github.com/nginx/nginx) | Interface graphique de l'application      | Oui                   |
| __keycloak__   | [Keycloak](https://github.com/keycloak/keycloak)                                | Gestionnaire d'authentification / d'accès | -                     |

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

> *Plus d'informations sur le développement d'un plugin [ici](./misc/plugins.md).*

## Développement

Le développement s'effectue directement dans un cluster Kubernetes à l'aide de Kind, un outil permettant de créer des noeuds Kubernetes dans des conteneurs Docker.

### Prérequis

Liste des outils utilisés par le projet à installer sur son ordinateur :

- [Docker](https://docs.docker.com/get-docker/) *- moteur d'exécution de conteneur*
- [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) *- kubernetes dans Docker*
- [Kubectl](https://kubernetes.io/fr/docs/tasks/tools/install-kubectl/) *- interface en ligne de commande pour kubernetes*
- [Helm](https://helm.sh/docs/intro/install/) *- gestionnaire de paquets kubernetes*
- [Nodejs](https://nodejs.org/en/download/) *- environnement d'exécution javascript*
- [Pnpm](https://pnpm.io/installation) *- gestionnaire de paquets pour javascript*

> *Pour la gestion des versions de Nodejs, il est recommandé d'utiliser [Volta](https://volta.sh/).*

### Lancer l'application

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

Les commandes de test de l'application :

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

Les commandes de suppression des ressources :

```shell
# Supprimer les ressources applicatives sans supprimer le cluster Kind
pnpm run kube:clean

# Supprimer entièrement le cluster et ses ressources
pnpm run kube:delete
```

L'intégralité des commandes est disponibles dans le fichier [package.json](./package.json) à la racine du projet, vous pouvez lancer ces dernières à l'aide de la commande `pnpm run <le_nom_du_script>`.

### Accès aux services

Les services sont disponibles via des nom de domaines ajouté dans le fichier `/etc/hosts` de votre système, l'ajout des domaines se fait automatiquement lors de la commande `pnpm run kube:init`.

| Service                                        | Url                     |
| ---------------------------------------------- | ----------------------- |
| Interface graphique *- (client)*               | <http://dso.local>      |
| Serveur *- (api)*                              | <http://dso.local/api>  |
| Interface d'administration de base de données  | <http://pgadmin.local>  |
| Interface d'administration du serveur keycloak | <http://keycloak.local> |

*__Notes:__ :warning: Il est possible que le navigateur utilisé (particulière Brave ou Firefox) bloque les cookies utilisés entre le frontend et keycloak, il est nécessaire de désactiver les protections de ce type dans votre navigateur (ex: Brave Shield).*

### Variables d'environnements

Un chart Helm utilitaire est installé pour déployer les services qui ne sont pas inclus dans le chart de la console :
- Keycloak
- Pgadmin

> *Ces services sont personnalisables [ici](./ci/helm-utils/values.yaml).*

Différents fichiers de `values.yml` sont disponibles pour personnaliser le déploiement de l'application dans le cluster Kind:
- Le fichier [./env/dso-values-dev.yaml](./env/dso-values-dev.yaml) contient les variables de l'application pour le mode développement.
- Le fichier [./env/dso-values.yaml](./env/dso-values.yaml) contient les variables de l'application pour le mode production.
- Le fichier [./env/dso-values-int-example.yaml](./env/dso-values-int-example.yaml) contient les variables de l'application pour le mode intégration.

*__Notes:__ Un fichier d'environnement `./env/.env` est disponible pour fournir le chemin d'accès vers la `kubeconfig` du cluster d'intégration.*

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
| **ArgoCD**       |                              |               | (infra) Secret, AppProject, Application |                      |
| **Gitlab**       | Group                        |               | Repository (Dépôt)                      | User                 |
| **Harbor**       | Project                      |               | Repository [1]                          |                      |
| **Keycloak**     |                              | Group         |                                         | User / member        |
| **Sonar**        | User                         |               |                                         |                      |
| **Nexus**        | Repositories, role, user ... |               |                                         |                      |

[1] N'est pas crée par la console mais par le produit de la CI

## Architecture du dépôt

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

## Conventions

Cf. [Conventions - MIOM Fabrique Numérique](https://projets-ts-fabnum.netlify.app/conventions/nommage.html).

## Contributions

Les commits doivent suivre la spécification des [Commits Conventionnels](https://www.conventionalcommits.org/en/v1.0.0/), il est possible d'ajouter l'[extension VSCode](https://github.com/vivaxy/vscode-conventional-commits) pour faciliter la création des commits.

Une PR doit être faite avec une branche à jour avec la branche `develop` en rebase (et sans merge) avant demande de fusion, et la fusion doit être demandée dans `develop`.