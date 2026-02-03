# Fichiers de configuration d'environnements

Cette documentation a pour but de détailler tout ce qui concerne la gestion des configuration d'environnements (appelé couramment "fichiers .env").

Comme vous aurez pu le constater, il y a beaucoup de choses à configurer pour un projet d'ampleur comme l'est la Console de CPiN, et il y a des cas d'usages très spécifiques qui seront décrits ici. Vous avez également la possibilité de composer votre propre manière de gérer vous variables d'environments en vous basant sur ce qui a été fait pour nous.

## Cas d'usage supportés

Avant de décrire dans le détail comment configurer les différents environments, il est important de rappeler les Cas d'Usage qui sont supportés par les scripts de CPiN:

- **Développement totalement en local** : vous déployez l'entièreté de l'écosystème de `console`, sans considération d'un branchement à l'extérieur, et vous développez directement en mode "serve" sur `client`, `server`, un `plugin` en particulier, ou peut-être même une combinaison des trois.
- **Développement conteneurisé en local** : vous déployez l'entièreté de l'écosystème de `console`, sans considération d'un branchement à l'extérieur, et même les composants fondamentaux de console (comme `client` et `server`) dans des conteneurs à l'aide d'images construites précédemment (en local, ou alors tirée depuis le registre de l'organisation CPiN)
- **Développement conteneurisé hybride** : vous déployez localement seulement une partie de l'écosystème de `console` (`client` et/ou `server`, de manière à utiliser votre code local) et pour le reste (Base de données de `console`, `keycloak`, `gitlab`, les clusters applicatifs, etc.), vous vous branchez à un environnement existant (appelé `integ` pour `INTEGRATION`). Ce cas d'usage est très pratique pour tester votre code avec de "vraies données" d'un environnement fonctionnel (comme notre environnement interne `cpin-hp`)
- Les cas de déploiements finaux du système complet, qui sont eux adressé par un chart Helm stocké dans [le dépôt `helm-charts`](https://github.com/cloud-pi-native/helm-charts)

Maintenant que ces définitions sont établies, passons à la configuration pour chacun des cas d'usage

## Considérations communes à tous les cas

Le mode de fonctionnement de la configuration des environnements est assez classique : les applications `client` et `server` ont besoin d'avoir certaines variables d'environnements définies.

Le mécanisme de surcharge des différentes configurations fonctionne de cette manière :

```
->: «surcharge»

var d'env settée explicitement -> fichier .env.docker (si contexte docker) -> fichier .env.integ (si INTEGRATION=true) -> fichier .env
```

## Prégénération des fichiers .env, .env.docker, et .env.integ

Un script permet de copier facilement les fichiers `.env*-example` en leur équivalent `.env*`: [`./ci/scripts/init-env.sh`](./ci/scripts/init-env.sh).

> Il faut ensuite remplir ces fichiers, car ils ne sont là que simplement copiés avec les valeurs par défaut

## Configuration pour le développement entièrement en local

Docker Compose utilisé : [`docker/docker-compose.local.yml`](docker/docker-compose.local.yml) (infrastructure uniquement : Keycloak, PostgreSQL, pgAdmin, OpenCDS mock)

Fichiers utilisés :

- `apps/client/.env`
- `apps/server/.env`

Les valeurs par défaut, disponibles dans les fichiers `.env-example`, sont suffisantes dans 99% des cas. Cela dit, c'est un cas d'usage assez restreint car la console se reposant sur quelques composants externes comme une base de données PostgreSQL ou un serveur IAM comme `keycloak`, il faut configurer manuellement les `.env` pour pointer sur les bonnes URLs, etc. Pas infaisable, mais pas très pratique au quotidien, hors des cas simple de build des applications.

**Commandes de lancement :**

```bash
# Lance l'infrastructure (Keycloak, PostgreSQL, pgAdmin, OpenCDS mock)
pnpm dev

# Puis dans d'autres terminaux, lancer le serveur et le client manuellement :
pnpm --filter server run dev
pnpm --filter client run dev
```

## Configuration pour le développement conteneurisé en local

Docker Compose utilisé : [`docker/docker-compose.dev.yml`](docker/docker-compose.dev.yml) (tout conteneurisé avec Docker Compose Watch)

Fichiers utilisés :

- `apps/client/.env`
- `apps/client/.env.docker`
- `apps/server/.env`
- `apps/server/.env.docker`

Cette configuration est déjà plus intéressante, car elle s'appuie sur les conteneurs définis dans [ce docker-compose](docker/docker-compose.dev.yml), qui lance notamment une base de données PostreSQL (ainsi qu'un `pgadmin`), et un serveur Keycloak préchargé avec un royaume qui contient un jeu de données. Le docker-compose contient des instructions `develop` qui permettent soit de synchroniser certains fichiers, soit de carrément reconstruire l'image et de relancer le service concerné. De cette manière vous pouvez développer en laissant les conteneurs tourner. C'est un peu moins performant qu'un travail totalement en local, mais ça a le mérite d'être plus proche du déploiement cible.

**Commande de lancement :**

```bash
# Lance l'ensemble des conteneurs (client, server, keycloak, postgres, pgadmin, opencds mock)
# avec Docker Compose Watch pour la synchronisation du code
pnpm docker:dev
```

## Configuration pour le développement hybride avec un environnement d'intégration existant

Docker Compose utilisé : [`docker/docker-compose.integ.yml`](docker/docker-compose.integ.yml) (sans Keycloak, branché sur l'environnement d'intégration distant)

Fichiers utilisés :

- `apps/client/.env`
- `apps/client/.env.docker`
- `apps/client/.env.integ`
- `apps/server/.env`
- `apps/server/.env.docker`
- `apps/server/.env.integ`

Cette configuration est une itération de la précédente. Dans ce cas d'usage le Keycloak n'est pas créé en tant que conteneur, car on est supposé se brancher sur l'environnement d'intégration défini dans les fichiers `.env.integ`. Le contenu de ces fichiers (en particulier celui de `apps/server`) est donc clé.

**Commandes de lancement :**

```bash
# Option 1 : Tout conteneurisé, branché sur l'environnement d'intégration
pnpm docker:integ

# Option 2 : Seulement l'infra en Docker (postgres, pgadmin), server et client en local avec mode integ
pnpm integ
# Puis dans d'autres terminaux :
pnpm --filter server run dev
pnpm --filter client run dev
```
