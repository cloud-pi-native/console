# Projets

## Créer un projet

Pour commencer à utiliser la plateforme Cloud π Native, il est tout d'abord nécessaire de créer un projet, le projet ici a une composante métier et pourra être composé de différentes briques applicatives.

Pour créer un projet :

1. [Se connecter](/login) à l'aide de vos identifiants SSO Cloud π Native.

2. Remplir le formulaire de création de projet.
    - Dans le menu latéral, section `Mes Projets`.
    - Cliquer sur le bouton `Créer un nouveau projet`.

La création d'un projet va lancer le provisionnement des différents services de la plateforme (Gitlab, Vault, Nexus, Quay, Sonarqube, ArgoCD), ce qui signifie principalement la création d'un groupe pour le projet dans chacuns des outils, l'association de droits sur ces groupes, la génération de secrets pour l'automatisation, etc...
> Cette opération demande d'attendre jusqu'à quelques minutes.


## Gérer les membres

:construction: *Disponible prochainement* :construction: 

## Gérer les environnements

:construction: *Disponible prochainement* :construction: 

## Gérer les dépôts de code

### Ajouter un dépôt

Afin que votre code externe soit récupéré par la plateforme pour les divers scans, construction et déploiement, il faut créer un dépôt sur le Gitlab interne et y lier votre dépôt externe.

Pour créer un dépôt :

1. [Se connecter](/login) à l'aide de vos identifiants SSO Cloud π Native.

2. Remplir le formulaire de synchronisation des dépôts.
    - Dans le menu latéral, section `Projets > Mes projets`.
    - Sélectionner un projet courant.
    - Dans le menu latéral, section `Projets > Dépôts synchronisés`.
    - Dans le cas d'un dépôt de code applicatif, générer les fichiers de *gitlab-ci* à l'aide du formulaire dans la console. Le fichier `.gitlab-ci-dso.yml` est à placer à la racine de votre dépôt externe et les `includes` (les autres fichiers `.yml`) sont à placer dans un dossier `includes/` à la racine de votre dépôt externe. Ces fichiers seront utilisés par le Gitlab de Cloud π Native pour effectuer les divers tests, scans et déploiements du projet.
    - Cliquer sur le bouton `Ajouter un nouveau dépôt`.

Lorsqu'un dépôt est créé dans la console en tant que `dépôt d'infrastructure`, la plateforme créé automatiquement l'application [ArgoCD](https://argo-cd.readthedocs.io/en/stable/) associée qui permettra le déploiement.

> Des exemples de dépôts sont disponibles dans la sections [tutoriels](/doc/tutorials).

> Cette opération demande d'attendre jusqu'à quelques minutes.

### Paramétrer la synchronisation

Une fois le dépôt interne à la plateforme créé et lié à un dépôt externe, il sera important de paramétrer la synchronisation entre le dépôt source et son clône.

Pour paramétrer la synchronisation d'un dépôt :

- Un dépôt nommé `<nom_de_votre_project>/<nom_de_votre_project>-mirror` a été créé dans le groupe Gitlab du projet. Dans ce dernier se trouve un script `script-mirror.sh` à copier dans votre dépôt externe.
  > Ce script a pour but de demander à la plateforme de synchroniser le dépôt en effectuant un appel api (avec authentification auprès de l'api gateway).
  > Il faut donc lancer ce script dans la CI/CD du dépôt source selon les évènements sur lesquels on souhaite déclencher une synchronisation (ex: lors d'un push sur la branche main).

- Dans le Gitlab de la plateforme, récupérer dans le dépôt `<nom_de_votre_project>/<nom_de_votre_project>-mirror` le token `GITLAB_TRIGGER_TOKEN` (`Settings > CI/CD > Pipeline triggers`, au besoin en créer un).

- Ajouter les variables d'environnements suivantes dans les __*secrets*__ de la CI/CD externe avec les valeurs fournies par l'équipe DSO ou précédemment récupérées (ces secrets seront utilisés par le script `script-mirror.sh`)

  | Nom de variable      | Description                                                                  |
  | -------------------- | ---------------------------------------------------------------------------- |
  | API_DOMAIN           | Url de l'API Gateway                                                         |
  | CONSUMER_KEY         | Clé d'authentification de l'application au travers de l'API Gateway          |
  | CONSUMER_SECRET      | Secret d'authentification de l'application au travers de l'API Gateway       |
  | GITLAB_TRIGGER_TOKEN | Token de déclenchement du pipeline de synchronisation dans le GitLab interne |

- Ajouter dans la CI/CD l'exécution de ce script pour déclencher la synchronisation automatiquement.
  
  *Exemple avec Github (synchro lors d'un push sur la branche main du dépôt source) :*

  ```yaml
  # Dans un fichier .github/workflows/script-mirror.yaml
  name: Repo sync with Cloud π Native

  on:
    push:
      branches:
        - "main"
    workflow_dispatch:

  jobs:
    mirror:
      name: Sync repo with Cloud π Native
      runs-on: ubuntu-latest
      steps:
        - name: Checks-out repository
          uses: actions/checkout@v3
        - name: Send a sync request to DSO api
          run: |
            sh ./path/to/script-mirror.sh \
              -a ${{ secrets.API_DOMAIN }} \
              -g ${{ secrets.GITLAB_TRIGGER_TOKEN }} \
              -k ${{ secrets.CONSUMER_KEY }} \
              -s ${{ secrets.CONSUMER_SECRET }}
  ```

- Répéter cette opération pour tous les dépôts y compris pour le ou les dépôts d'infrasctructure as code.

La synchronisation est maintenant en place et chaque appel API effectué avec le script `script-mirror.sh` entrainera le déclenchement de la chaine DevSecOps.
