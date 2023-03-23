# Introduction

## Concept

La plateforme laisse les développeurs travailler sur leurs dépôts de code source habituels (dépôts externes) en effectuant des synchronisations du code source vers un [Gitlab](https://about.gitlab.com/) hébergé par la plateforme (dépôts internes).
Les synchronisations sont déclenchées par des appels API effectués dans les CI/CD côté développeurs (dépôts externes).
Ces appels API permettent de déclencher auprès de DSO une demande de 'pull' du dépôt qui entrainera le déclenchement d'une autre chaine de CI/CD sur le Gitlab de la plateforme. Cette dernière sera en charge de :

- Lancer les jeux de tests applicatif (unitaires, de bout en bout, ...).
- Effectuer une analyse de la qualité du code source à l'aide d'un [Sonarqube](https://www.sonarqube.org/) hébergé par la plateforme.
- Construire les images de conteneur de l'application.
- Scanner les images et le code source à l'aide de [Trivy](https://aquasecurity.github.io/trivy).
- Stocker ces images dans un [Quay](https://quay.io/) hébergé par la plateforme.

Une fois l'application construite et les images de cette dernière stockées dans la registry de la plateforme, le déploiement pourra être effectué selon le modèle gitops à l'aide de [ArgoCD](https://argo-cd.readthedocs.io/en/stable/).

## Architecture

Schéma d'architecture fonctionnelle de la plateforme :

![archi](/img/architecture.png)

## Services de la plateforme

Liste des services de la plateforme :

| Service   | Description                               | Obligatoire |
| --------- | ----------------------------------------- | ----------- |
| Gitlab    | Hébergement de code et pipeline CI/CD     | Oui         |
| Vault     | Hébergement de secrets                    | Oui         |
| Quay      | Hébergement d'image de conteneur          | Oui         |
| Nexus     | Hébergement d'artefacts                   | Oui [1]     |
| Sonarqube | Analyse de qualité de code                | Oui         |
| Argocd    | Outil de déploiement automatique (GitOps) | Oui         |

[1] : *Instanciation au niveau du projet obligatoire mais utilisation selon le besoin.*
