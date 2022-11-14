# Cloud Pi Native

:warning: __*La plateforme est en cours de construction et des évolutions fréquentes sont à prévoir.*__ :warning:
__*Pour toute demande, contactez l'équipe DSO*__

L'offre Cloud Pi Native, portée par le Ministère de l'Intérieur et des Outre-Mer et à visée interministérielle a pour but d'améliorer la qualité applicative tout en améliorant les capacités de déploiement au sein de l'administration.

Cette offre s'appuie sur le [Cloud Pi](https://www.numerique.gouv.fr/services/cloud/cloud-interne/) pour le déploiement des applications dans un cluster OpenShift ainsi que sur une plateforme de déploiement offrant un catalogue de services pour suivre le cycle de vie complet de son projet.

## Concept

La plateforme laisse les développeurs travailler sur leurs dépôts de code source habituels (dépôts externes) en effectuant des synchronisations du code source vers un [Gitlab](https://about.gitlab.com/) hébergé par la plateforme (dépôts internes).
Les synchronisations sont déclenchées par des appels API effectués dans les CI/CD côté développeurs (dépôts externes).
Ces appels API permettent de déclencher auprès de DSO une demande de 'pull' du dépôt qui entrainera le déclenchement d'une autre chaine de CI/CD sur le Gitlab de la plateforme. Cette dernière sera en charge de :

- Lancer les jeux de tests applicatif (unitaires, de bout en bout, ...).
- Effectuer une analyse de la qualité du code source à l'aide d'un [Sonarqube](https://www.sonarqube.org/) hébergé par la plateforme.
- Construire les images de conteneur de l'application.
- Scanner les images et le code source à l'aide de [Trivy](https://aquasecurity.github.io/trivy).
- Stocker ces images dans un [Quay](https://quay.io/) hébergé par la plateforme.
- Déployer les images générées à l'aide d'[ArgoCD](https://argo-cd.readthedocs.io/en/stable/).

## Dépôts de code

La plateforme est open sources et est construite à partir des dépôts de code suivants:

- Code du socle (déploiement des services & provisionning des espaces projets)
  - <https://github.com/dnum-mi/dso-socle>
- Code de la console (interface utilisateur, documentation).
  - <https://github.com/dnum-mi/dso-console>
  - <https://github.com/dnum-mi/dso-console/tree/main/client/src/documentation>
