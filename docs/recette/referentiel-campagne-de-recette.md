# Référentiel de campagne de recette

## Objet

Ce référentiel définit les données, preuves et conditions de nettoyage d’une campagne de recette manuelle avant la mise en Production d’une version de la Console Cloud π Native.

Les projets de recette sont indépendants, créés pour la campagne puis supprimés. Le référentiel ne contient ni secret réel, ni UUID fixe, ni URL cible, ni trace d’exécution.

Ce document qualifie une cible théorique à valider avec l’équipe. Il ne déclenche aucune campagne de recette et ne prescrit pas encore son automatisation.

## Cycle d’une campagne de recette

1. Vérifier la santé des services, la topologie cible et l’absence de résidus.
2. Créer puis qualifier chaque scénario dans l’ordre `REC-01` à `REC-07`.
3. Relever les preuves et anomalies dans le compte-rendu.
4. Supprimer les projets depuis la Console dans l’ordre inverse.
5. Vérifier l’absence des ressources gérées par la Console dans les services concernés.
6. Décider la mise en Production à partir du compte-rendu.

Une anomalie non explicitement prévue échoue le scénario. Une correction manuelle dans un service tiers est interdite : la cause est tracée, corrigée dans la Console ou la fixture, puis le scénario est rejoué. Seul `REC-07` contient un échec attendu et sa reprise.

## Conventions de données

Une campagne est identifiée par la version et le commit Console, la chaîne cible et sa date. Les valeurs de topologie sont exprimées par des alias, par exemple `ZONE_FORMATION`, `CLUSTER_RECETTE` et `STAGE_DEV`.

Les noms de projet d’exécution suivent `rec-<version-console>-<yyyymmdd>-<slug-metier>`. Exemple : `rec-9-27-0-20261006-dossiers-usagers`.

Chaque dépôt et source de déploiement est relevé avec son SHA. Les tags d’image sont propres à la campagne et leur digest Harbor immuable est relevé dans le compte-rendu.

## Scénarios canoniques

| ID | Projet métier | Intention |
| --- | --- | --- |
| REC-01 | Espace de gestion des dossiers | Provisionnement du projet, propriétaire/membres, rôles système et custom, habilitations Console/Keycloak/GitLab, puis suppression. |
| REC-02 | Gestion des dossiers usagers | Référence stateful multirepo basée sur les quatre dépôts de formation : Java, Nexus/Sonar, image Harbor/Trivy, PostgreSQL Helm, ArgoCD/Kubernetes. |
| REC-03 | Portail d’information publique | Application stateless, dépôts applicatif et IaC distincts, manifests/Kustomize. |
| REC-04 | Portail de démarches en ligne | Application stateless Helm en monorepo. |
| REC-05 | Instruction des demandes | Promotion d’une même application entre `dev`, `integration` et `prod`, avec quotas, synchronisation et révisions distinctes. |
| REC-06 | Référentiel des règles métier | Déploiement moderne avec plusieurs sources IaC et/ou une source de values externe ; ordre des surcharges. |
| REC-07 | Échanges sécurisés avec les partenaires | Dépôt privé, identifiants de miroir, échec contrôlé, reprise par reprovisionnement, puis suppression. |

## Données requises par scénario

Chaque scénario définit :

- son projet : libellé, nom généré, propriétaire, membres, rôles et quotas ;
- les plugins activés ;
- ses environnements : alias de topologie, stage, cluster, CPU, RAM, GPU et autosync ;
- ses dépôts : rôle, URL, public/privé, nom interne, SHA, chemin et type de source ;
- ses déploiements : environnement, sources, SHA et ordre des values ;
- ses artefacts : nom, tag de campagne, digest Harbor, Quality Gate Sonar et observation Trivy ;
- ses preuves : action Console, état externe attendu et référence de preuve ;
- son nettoyage : suppression et contrôle d’absence par service.

Les secrets ne sont décrits que par leur finalité et leur emplacement. Les identifiants générés sont relevés dans le compte-rendu, jamais prescrits.

## Matrice minimale de preuves

| Service | Preuve attendue |
| --- | --- |
| Console | État, ressources, rôles, déploiements, journaux, puis absence après suppression. |
| Keycloak | Groupes et appartenances, puis absence. |
| GitLab | Groupe, dépôts, miroir, pipelines, droits, puis absence. |
| Vault | Chemins de secrets et accès par rôle, puis révocation ou suppression. |
| Nexus | Plugin, consommation des identifiants et build Maven. |
| SonarQube | Projet, analyse et Quality Gate. |
| Harbor/Trivy | Registry, image taggée, digest et scan. |
| ArgoCD/Kubernetes | Sources, révisions, values, `Synced`, `Healthy`, namespace, quotas et workloads. |
| Grafana/logs | Métriques et journaux d’un workload déployé. |

## Golden path de formation : prérequis

`REC-02` réemploie le parcours formé par `formation-cpin-gestion-projet`, `formation-cpin-repo-applicatif`, `formation-cpin-harbor-trivy` et `formation-cpin-deploiement`.

Ces dépôts ne sont pas encore une fixture déterministe : les révisions `main` et `tuto` sont mobiles ; `.gitlab-ci-dso.yml` et `values-demo.yaml` sont créés manuellement ; la documentation annonce Java 21 alors que le `pom.xml` déclare Java 17.

Avant de déclarer `REC-02` rejouable à l’identique, les dépôts de formation doivent fournir une CI versionnée, un overlay de values versionné, un niveau Java décidé et une convention de tag propre à une campagne de recette. Ces évolutions sont des dépendances externes.

## Compte-rendu et données non versionnées

Utiliser le [modèle de compte-rendu](./modele-compte-rendu-campagne-de-recette.md) pour chaque release candidate.

Le compte-rendu complété est joint à la release candidate ou à son issue de qualification. Il n’est pas commité : il contient des URL et identifiants opérationnels transitoires.
