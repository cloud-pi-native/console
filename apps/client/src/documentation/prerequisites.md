# Prérequis

## Processus

- Avoir un compte dans le SSO de Cloud π Native (à demander à l'équipe DSO).
- Avoir l'url de l'API Gateway (`API_DOMAIN`) (à demander à l'équipe DSO).
- Avoir une clé d'authentification (`CONSUMER_KEY`) auprès de l'API Gateway (à demander à l'équipe DSO).
- Avoir un secret d'authentification (`CONSUMER_SECRET`) auprès de l'API Gateway (à demander à l'équipe DSO).

## Techniques

### Construction

L'application déployée doit être conteneurisée (sous la forme de un ou plusieurs conteneurs).
  - Les __Dockerfiles__ doivent être dans le dépôt pour permettre à la chaine de reconstruire l'application.
  - Les images de bases des __Dockerfiles__ doivent être accessibles publiquement.
  - Les images doivent être __rootless__, l'utilisateur qui lance le processus au sein du conteneur ne doit pas être `root` (cf. [liens utiles](/doc/utils) pour en apprendre plus sur le concept de __rootless__ et les spécificités d'Openshift).
  L'utilisateur lançant le processus dans le conteneur doit avoir les droits adéquats en lecture / écriture sur le système de fichiers si l'application doit manipuler ce dernier.

### Déploiement

L'application doit se déployer à l'aide de fichiers d'__Infrastructure As Code__, pour ce faire 2 solution s'offrent aux utilisateurs.
 - Utiliser des manifestes [kubernetes](https://kubernetes.io/).
 - Utiliser des charts [helm](https://helm.sh/) (cf. [tutoriels](/doc/tutorials) pour avoir des exemples de fichiers).

### Synchronisation des dépôts

Si le dépôt externe est privé, fournir à Cloud π Native un jeton d'accès personnel (PAT dans GiHub) avec le scope `repo` permettant de pull le dépôt.
