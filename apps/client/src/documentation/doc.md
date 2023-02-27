# Utilisation de la plateforme

## Prérequis

### Processus

- Avoir un compte dans le SSO de Cloud π Native (à demander à l'équipe DSO).
- Avoir l'url de l'API Gateway (`API_DOMAIN`) (à demander à l'équipe DSO).
- Avoir une clé d'authentification (`CONSUMER_KEY`) auprès de l'API Gateway (à demander à l'équipe DSO).
- Avoir un secret d'authentification (`CONSUMER_SECRET`) auprès de l'API Gateway (à demander à l'équipe DSO).

### Techniques

- L'application déployée doit être conteneurisée (sous la forme de un ou plusieurs conteneurs).
  - Les __Dockerfiles__ doivent être dans le dépôt pour permettre à la chaine de reconstruire l'application.
  - Les images de bases des __Dockerfiles__ doivent être accessible publiquement.
  - Les images doivent être __rootless__, l'utilisateur qui lance le processus au sein du conteneur ne doit pas être `root` (cf. [Liens utiles](#liens-utiles) pour en apprendre plus sur le concept de __rootless__ et les spécificités d'Openshift).

- L'application doit se déployer à l'aide de fichiers d'__Infrastructure As Code__ [kubernetes](https://kubernetes.io/).
  > Pour le moment nous ne générons pas de fichiers d'infrastructure, c'est donc à la main de l'utilisateur de l'offre.
  > Nous souhaitons ultérieurement mettre à disposition des templates pour couvrir les architectures majoritaires.
  
- Si le dépôt externe est privé, fournir à Cloud π Native un jeton d'accès personnel (PAT dans GiHub) avec le scope `repo` permettant de pull le dépôt.
  > Réflexion en cours sur l'amélioration du système de mirroring des dépôts.

## Get Started
### Commander un espace projet

1. [Se connecter](/login) à l'aide de vos identifiants SSO Cloud π Native.

2. Remplir le formulaire de création de projet.
    - Dans le menu latéral, section `Mes Projets`.
    - Cliquer sur le bouton `Créer un nouveau projet`.

### Synchroniser les dépôts

1. [Se connecter](/login) à l'aide de vos identifiants SSO Cloud π Native.

2. Remplir le formulaire de synchronisation des dépôts.
    - Dans le menu latéral, section `Mes projets`.
    - Sélectionner un projet courant.
    - Dans le menu latéral, section `Dépôts synchronisés`.
    - Générer les fichiers de *gitlab-ci* à l'aide du formulaire dans la console. Le fichier `.gitlab-ci-dso.yml` est à placer à la racine de votre dépôt externe et les `includes` (les autres fichiers `.yml`) sont à placer dans un dossier `includes/` à la racine de votre dépôt externe. Ces fichiers seront utilisés par le Gitlab de Cloud π Native pour effectuer les divers tests, scans et déploiements du projet.
    - Cliquer sur le bouton `Ajouter un nouveau dépôt`.

Pour que la synchronisation des dépôts soit effective, suivre ces instructions :

- Un dépôt nommé `<nom_de_votre_project>/<nom_de_votre_project>-mirror` a été créé dans votre projet sur le Gitlab interne de la plateforme. Dans ce dernier se trouve un script `script-mirror.sh` à copier dans votre dépôt externe.
  > Ce script a pour but de demander à la plateforme de synchroniser le dépôt, il vous faut donc lancer ce script la CI/CD de votre dépôt source.

- Dans le Gitlab de la plateforme, récupérer dans le dépôt `<nom_de_votre_project>/<nom_de_votre_project>-mirror` le token `GITLAB_TRIGGER_TOKEN` (`Settings > CI/CD > Pipeline triggers`, au besoin en créer un).

- Ajouter les variables d'environnements suivantes dans les __*secrets*__ de votre CI/CD externe avec les valeurs fournies par l'équipe DSO ou précédemment récupérées:

  | Nom de variable      | Description                                                                  |
  | -------------------- | ---------------------------------------------------------------------------- |
  | API_DOMAIN           | Url de l'API Gateway                                                         |
  | CONSUMER_KEY         | Clé d'authentification de l'application au travers de l'API Gateway          |
  | CONSUMER_SECRET      | Secret d'authentification de l'application au travers de l'API Gateway       |
  | GITLAB_TRIGGER_TOKEN | Token de déclenchement du pipeline de synchronisation dans le GitLab interne |

- Ajouter dans votre CI/CD l'exécution de ce script pour déclencher la synchronisation automatiquement.
  
  *Exemple avec Github :*

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

- Placer vos manifestes Kubernetes dans le dépôt `<nom_de_votre_project>/<nom_de_votre_project>-argo` du Gitlab interne de la plateforme (les placer dans le dossier `base/`).

La synchronisation est maintenant en place et chaque appel API effectué avec le script `script-mirror.sh` entrainera le déclenchement de la chaine DevSecOps.

## Architecture
![archi](/img/architecture.png)
## Services de la plateforme

| Service   | Description                               |
| --------- | ----------------------------------------- |
| Gitlab    | Hébergement de code et pipeline CI/CD     |
| Vault     | Hébergement de secrets                    |
| Quay      | Hébergement d'image de conteneur          |
| Nexus     | Hébergement d'artefacts                   |
| Sonarqube | Analyse de qualité de code                |
| Argocd    | Outil de déploiement automatique (GitOps) |


## Liens utiles 

- [Kubernetes Basics: Pods, Nodes, Containers, Deployments and Clusters](https://www.youtube.com/watch?v=B_X4l4HSgtc) - *video en anglais*
- [Kubernetes in 5 mins](https://www.youtube.com/watch?v=PH-2FfFD2PU) - *video en anglais*
- [Adapting Docker and Kubernetes containers to run on Red Hat OpenShift Container Platform](https://developers.redhat.com/blog/2020/10/26/adapting-docker-and-kubernetes-containers-to-run-on-red-hat-openshift-container-platform#) - *article en anglais*
- [Building rootless containers for JavaScript front ends](https://developers.redhat.com/blog/2021/03/04/building-rootless-containers-for-javascript-front-ends#) - *article en anglais*

## Contact

Pour toute information ou demande pour rejoindre la betatest, veuillez nous contacter à l'adresse suivante : <cloudpinative-relations@interieur.gouv.fr>.
Si vous faites déjà parti des beta testeurs et que vous souhaitez poser des questions ou avoir de l'accompagnement, veuillez nous contacter directement via le serveur Mattermost prévu à cet effet (si vous n'avez pas été ajouté au serveur Mattermost, veuillez contacter l'adresse mail précédente).