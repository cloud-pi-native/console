# Gestion des versions

Ce document décrit comment est géré le versionnement de `console`, c'est-à-dire les différents aspects qui nous permettent de :

- Préparer la création d'une nouvelle version de `console` au fur et à mesure des ajouts
- Créer effectivement la nouvelle version
- Mettre à jour le chart Helm concerné
- Publier les nouvelles versions de modules NPM concernés

## Versionnement de Console

Le flux de travail qui créé les nouvelles versions s'intitule `create-or-update-release` et est déclenché à chaque nouveau commit sur `main` (soit lorsqu'on fusionne une requête de fusion, soit un commit poussé en outrepassant l'interdiction de pousser sur `main`).

Le flux de travail utilise [release-please-action](https://github.com/googleapis/release-please-action) pour automatiquement générer les tags Git ainsi que les nouvelles versions sur GitHub. À chaque fois que du code est poussé dans la branche `main`, une requête de fusion de version est créée en analysant les messages de commits pour déterminer le numéro de version à créer (patch/mineur/majeur). Si une requête de fusion de nouvelle version existe déjà, elle est mise à jour afin de refléter les nouveaux changements ajoutés à la future nouvelle version.

Les types de commits qui déclenchent une nouvelle version (ou mettent à jour la MR de la prochaine version) sont décrit dans la configuration de release-please, [`./release-please-config.json`](./release-please-config.json)

À chaque fois qu'une requête de fusion de version est fusionnée, les images de conteneur des applications (`client`, `server`, etc.) sont alors créées et hébergées dans la [registry Github associée au dépôt](https://github.com/orgs/cloud-pi-native/packages?repo_name=console).

## Versionnement du chart Helm `dso-console`

Le déploiement de `console` se fait préférablement à l'aide de son chart Helm, nommé [`dso-console`](https://github.com/cloud-pi-native/helm-charts/tree/main/charts/dso-console).

La dernière étape du flux de travail de création de nouvelles versions (cf. section ci-dessus) est la création automatique d'une requête de fusion dans le dépôt `helm-charts` pour la mise à jour du chart Helm `dso-console`. Une fusion manuelle sur ce dépôt est alors nécessaire pour déclencher la publication de la nouvelle version du chart Helm (embarquant donc la nouvelle version de `console`). Exemple d'une telle requête de fusion de nouvelle version du chart Helm : https://github.com/cloud-pi-native/helm-charts/pull/204.

## Versionnement des modules NPM

La publication des nouvelles versions de modules npm du dépôt est automatique et est inclus dans le flux de travail de création d'une nouvelle version. Il analyse les numéros de version présents dans les différents fichiers `package.json` pour déterminer si une nouvelle version du module doit être créée et publiée.

> Il est possible de créer une version de pré-release d'un module npm en modifiant la clé `publishConfig.tag` dans le `package.json` avec par exemple `beta` pour générer une version beta.
