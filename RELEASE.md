# Gestion des versions

Ce document décrit comment est géré le versionnement de `console`, c'est-à-dire :

- Préparer les pré-releases et les releases stables de `console`
- Créer effectivement les versions correspondantes dans GitHub
- Mettre à jour le chart Helm `dso-console`
- Publier les nouvelles versions de modules NPM concernés

## Incrémentation des versions

Afin d'éviter une confusion entre les hotfixes — historiquement des versions `PATCH` rétroportées sur `main` — et les versions régulières produites par des commits `fix:`, les releases stables adoptent le protocole suivant :

- Les versions régulières sur `main` sont par défaut des `MINOR` (et très rarement des `MAJOR`).
- Une release candidate utilise la **prochaine** version stable visée, suffixée par `-rc`, puis `-rc.N` pour les candidates suivantes. Par exemple:
  - Si la dernière version publiée est la `9.24.5`, la prerelease (RC) suivante sera la `9.25.0-rc`
  - Si la dernière version publiée est la `9.32.0-rc2`, la prerelease suivante sera la `9.32.0-rc3`
- Les hotfixes sont forcément des versions `PATCH`. ⚠️Leur automatisation est actuellement suspendue ; voir la section [Hotfixes](#hotfixes) ⚠️

La structure de versionnement stable de `console` est donc **`MAJOR`.`MINOR`.`HOTFIX`**. Les RC ont la forme **`MAJOR`.`MINOR`.`HOTFIX`-rc** ou **`MAJOR`.`MINOR`.`HOTFIX`-rc.`INCREMENT`**.

## Schéma récapitulatif

Les sections suivantes vont expliciter ce schéma:

```mermaid
gitGraph
    branch release-please-main
    commit id:" "

    %% Initial state: latest tag on main = v1.2.5
    checkout main
    commit id: "Bump v1.2.5" tag: "v1.2.5"

    %% Some commits are added to main
    commit id: "feat: something"

    %% Job create-or-update-release triggers release-please
    %% which will upsert the next release MR, which will be a prerelease
    checkout release-please-main
    merge main
    commit id: "Bump v1.3.0-rc"

    %% Upon merging the release-please MR
    %% The new tag is created
    checkout main
    merge release-please-main tag: "v1.3.0-rc"
    %% and the release-please MR for the next stable release is created
    checkout release-please-main
    merge main
    commit id: "Bump v1.3.0"

    %% IF new commits are added BEFORE merging the release-please MR,
    %% a new prerelease MR will replace the stable release MR
    checkout main
    commit id: "fix: something"
    checkout release-please-main
    merge main
    commit id: "Bump v1.3.0-rc1"

    %% Upon merging the release-please MR
    %% The new tag is created
    checkout main
    merge release-please-main tag: "v1.3.0-rc1"
    %% and the release-please MR for the next stable release is created
    checkout release-please-main
    merge main
    commit id: "Bump v1.3.0 (updated)"

    %% IF the stable release MR is merged into main
    checkout main
    merge release-please-main tag: "v1.3.0"

    %% New commits are then pushed to main
    %% and the cycle starts anew
    commit id: "chore: something"

    %% Job create-or-update-release triggers release-please
    %% which will upsert the next release MR, which will be a prerelease
    checkout release-please-main
    merge main
    commit id: "Bump v1.3.1-rc"
```

## Versionnement de Console

Le flux de travail [`create-or-update-release`](https://github.com/cloud-pi-native/console/blob/main/.github/workflows/workflow-create-or-update-release.yml) est déclenché à chaque nouveau commit sur `main`.

Il utilise le job réutilisable [`Next Prerelease and Release`](https://github.com/cloud-pi-native/console/blob/main/.github/workflows/job-release-please.yml) et notamment la GitHub Action [release-please-action](https://github.com/googleapis/release-please-action).

Deux configurations isolent les états de version :

- [`.github/prerelease-please-config.json`](./.github/prerelease-please-config.json) et son [manifest](./.github/prerelease-please-manifest.json) gèrent les préreleases (ou "Release Candidates", dénotées "RC") ;
- [`.github/release-please-config.json`](./.github/release-please-config.json) et son [manifest](./.github/release-please-manifest.json) gèrent les releases "stables". La release stable met aussi à jour le manifeste de prérelease afin de réinitialiser le cycle suivant depuis cette version (si on était à la `-rc14`, on réinitialise à `-rc` pour la prochaine version).

À chaque exécution, le job `prepare` finalise d'abord toute requête de fusion de release déjà fusionnée, puis crée ou met à jour la prochaine requête de fusion.
Plus concrètement, le cycle est le suivant :

1. Les commits classiques (`feat`, `chore`, etc.) sur `main` déclenchent les workflows GitHub qui vont créer/mettre à jour une MR de prerelease.
2. La fusion de cette MR dans `main` crée effectivement la prerelease:
  a. Création du tag git `vX.Y.Z-rc`. Les RC suivantes de la même version sont taguées `vX.Y.Z-rc.N`, où `N` vaut `1`, puis `2`, etc.
  b. Création des images OCI/docker poussées en tant que "packages" dans l'organisation GitHub `cloud-pi-native`
  c. Création de la Release GitHub, avec cependant une étiquette "Pré-release" pour indiquer que ce n'est pas une version "stable". Ce n'est, par exemple, pas la version qui est affichée sur la page de garde du dépôt
  d. Création de la MR côté `helm-chart` qui va faire un bump mineur du chart `dso-console` avec comme `appVersion` la version RC nouvellement créée (il faudra alors fusionner cette MR pour avoir un chart à jour)
3. Après la création de la prerelease, vu que son commit de "bump" de version a été poussé sur `main`, les workflows sont à nouveaux déclenchés et une MR de release stable `vX.Y.Z` est créée.
4. La fusion de cette MR crée la release GitHub stable `vX.Y.Z`
5. Tout nouveau commit classique poussé sur `main` déclenchera la création de la prochaine MR de prérelease (retour à l'étape 1)

**⚠️NOTE⚠️**: Si jamais, après l'étape `3` (création de la MR pour la release "stable") des commits "classiques" sont poussés sur `main` alors **la MR de la release stable sera automatiquement "convertie" en MR de prerelease**. Dit autrement: **On ne peut créer une version "stable" qu'à partir d'une prerelease**. Tout commit en plus empêche d'avoir une release "stable", il faut forcément qu'il y ait ZERO commit après une prerelease pour avoir une MR de release "stable".

Les différents types de commits (`chore:`, `feat:`, `fix:`, etc.) alimentent les sections du `CHANGELOG.md` selon les deux configurations release-please ci-dessus.

Lorsqu'une RC ou une release stable est créée, les images de conteneur des applications (`client`, `server`, etc.) sont publiées dans la [registry GitHub du dépôt](https://github.com/orgs/cloud-pi-native/packages?repo_name=console) avec le tag complet correspondant. Une release stable met aussi à jour les tags partiels `vX` et `vX.Y` ; ⚠️ Les RC ne touchent **jamais** à ces tags "mouvants". Ils sont là explicitement pour traquer la dernière version stable, majeure ou mineure.

> Les tags complets (`vX.Y.Z`, `vX.Y.Z-rc` et `vX.Y.Z-rc.N`) sont immutables. Seuls les tags partiels stables (`vX` et `vX.Y`) sont recréés pour référencer la dernière release stable. Après une release stable, il est recommandé d'exécuter `git pull --tags --force` afin de recréer localement ces tags partiels.

## Versionnement du chart Helm `dso-console`

Le déploiement de `console` se fait préférablement à l'aide de son chart Helm, nommé [`dso-console`](https://github.com/cloud-pi-native/helm-charts/tree/main/charts/dso-console).

Lorsqu'une RC ou une release stable est créée, le flux de travail déclenche automatiquement une requête de fusion dans le dépôt `helm-charts` afin de mettre à jour le chart Helm `dso-console` avec l'`APP_VERSION` complète correspondante. Une fusion manuelle sur ce dépôt reste nécessaire pour publier la nouvelle version du chart. Exemple de requête de fusion : https://github.com/cloud-pi-native/helm-charts/pull/204.

> Une RC et une release stable produisent le même type de requête de fusion côté `helm-charts`. Le chart référence cependant l'`APP_VERSION` complète : une RC conserve donc son suffixe `-rc` ou `-rc.N`.

## Versionnement des modules NPM

La publication des nouvelles versions de modules npm du dépôt est automatique et est inclus dans le flux de travail de création d'une nouvelle version. Il analyse les numéros de version présents dans les différents fichiers `package.json` pour déterminer si une nouvelle version du module doit être créée et publiée.

> Il est possible de créer une version de pré-release d'un module npm en modifiant la clé `publishConfig.tag` dans le `package.json` avec par exemple `beta` pour générer une version beta.

## Hotfixes

Autant que faire se peut il vaut mieux privilégier le "Fix Forward" avec de nouvelles versions, afin d'éviter la charger de générer/rétroporter un hotfix.

Ceci étant dit, il arrivera, hélas, qu'un hotfix soit nécessaire sur une version livrée.

> ⚠ Les branches `hotfix/*` ne déclenchent actuellement plus le flux `create-or-update-release`. La procédure automatisée de hotfix est donc suspendue.
>
> En attendant son rétablissement (cf https://github.com/cloud-pi-native/console/issues/2610), un correctif destiné à une version livrée doit être intégré à `main` et livré via le prochain cycle de pré-release puis de release stable. Il suit donc la stratégie de « Fix Forward ».
