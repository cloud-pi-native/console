# SonarQube

[← Index transversal de la cartographie](../../../../../docs/architecture/plugins.md)

## Périmètre et état de migration

Le module `sonarqube` provisionne utilisateurs, tokens, projets, permissions et groupes SonarQube, et prépare les variables d’analyse dans GitLab. Plugin historique : `plugins/sonarqube/src/`.

## Relations observées

### Sorties

| Fournisseur       | Finalité métier                                                                  | Nature                     | Mécanisme observé                                                                                          | Entrées → sorties                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Vault             | Stocker/récupérer les identifiants de l’utilisateur SonarQube et son token.      | fonctionnelle et technique | `VaultClientService` injecté et méthodes `readSonarqubeUser`, `writeSonarqubeUser`, `deleteSonarqubeUser`. | projet → secret SonarQube, utilisé pendant la synchronisation.                                                    |
| GitLab            | Configurer dépôt d’analyse et variables de groupe/dépôt pour exécuter l’analyse. | fonctionnelle et technique | Injection `GitlabClientService`.                                                                           | projet + repository + projet SonarQube → dépôt système/analyse et variables CI `PROJECT_KEY`, `SONAR_TOKEN`, etc. |
| SonarQube externe | Gérer utilisateurs, tokens, groupes, projets et permissions.                     | fonctionnelle et technique | `SonarqubeClientService`.                                                                                  | projet et repositories → ressources SonarQube.                                                                    |
| Événements projet | Déclencher la synchronisation et la suppression des ressources.                  | fonctionnelle et technique | Écoute `project.upsert` et `project.delete`, résultats capturés.                                           | `ProjectWithDetails` → résultat SonarQube OK/KO.                                                                  |

### Entrées

- `project.upsert` synchronise le groupe de projet, les repositories, permissions et variables GitLab, ainsi que l’utilisateur/token Vault/SonarQube.
- `project.delete` nettoie les ressources projet SonarQube et les credentials associés dans Vault.
- Observability n’est pas un dépendant SonarQube prouvé dans le code étudié.
- Le plugin historique consomme `VaultProjectApi` pour lire/écrire le secret `SONAR` et `KeycloakProjectApi.getProjectGroupPath()` pour les permissions de projet. Le module NestJS conserve une dépendance directe à Vault et GitLab, mais n’importe pas Keycloak : c’est un delta de portage à qualifier.

## Séquences métier

- **Réconciliation projet** : créer/réconcilier l’utilisateur de projet SonarQube et stocker son mot de passe/token dans Vault ; retrouver le token ; obtenir le groupe GitLab ; créer/réconcilier projets SonarQube par dépôt ; mettre à jour variables GitLab de groupe et de repository.
- **Déprovisionnement** : supprimer les projets/utilisateur/permissions du projet SonarQube puis supprimer les credentials SonarQube de Vault.
- **Orphan repositories** : comparer les projets SonarQube présents à la liste actuelle de dépôts Console et supprimer les projets d’analyse orphelins ; cette opération reste interne à la réconciliation SonarQube.

## Contrats cibles recommandés et delta

| Couture observée                                                                                                                                               | Propriétaire cible                                                                                           | Contrat recommandé (proposition)                                                                                                               | Garanties                                                                                                                      | Delta                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SonarQube manipule directement le client GitLab pour créer des dépôts/variables de pipeline.                                                                   | GitLab possède groupes, dépôts et variables ; SonarQube décrit l’intention de configuration d’analyse.       | Contrat GitLab `configureSonarAnalysis(project, repository, projectKey, tokenRef)` ou opérations minimales spécialisées de dépôt et variables. | Secrets masqués et scopes explicites ; idempotence ; aucun type SDK GitLab dans le contrat ; nettoyage lors d’une suppression. | Remplacer `GitlabClientService` et construire un port d’intention SonarQube dans GitLab ; préciser la gestion du token partagé groupe et celui des variables dépôt. Statut : `à arbitrer`. |
| SonarQube et GitLab partagent le secret token via Vault et variables CI.                                                                                       | Vault possède le secret ; GitLab possède la ressource de variable CI ; SonarQube possède l’usage du token.   | Référence de secret minimale ou contrat de distribution vers GitLab, sans faire transiter le secret via un type Vault générique.               | Masquage/protection/scopes, aucune valeur secrète dans logs, rotation répercutée, ordre de suppression défini.                 | Décider quel module orchestre la distribution et la rotation du token ; le comportement actuel est réparti SonarQube → Vault et SonarQube → GitLab. Statut : `à arbitrer`.                 |
| Le plugin historique appelle `KeycloakProjectApi.getProjectGroupPath()` pendant le provisioning, mais le module NestJS SonarQube n’importe pas KeycloakModule. | Keycloak possède les groupes d’identité ; SonarQube possède la configuration des permissions de ses projets. | Requête de groupes/rôles nécessaire à SonarQube, sans exposer l’objet API Keycloak complet.                                                    | Identifiants de groupe métier stables, erreurs typées et alignement avec le provisioning de Keycloak/Observability.            | Confirmer si le comportement legacy est toujours requis et s’il est couvert autrement dans la migration ; si oui, porter le besoin via un contrat Keycloak. Statut : `à arbitrer`.         |

## Preuves et limites

- `sonarqube.module.ts` importe `GitlabModule` et `VaultModule`, pas `KeycloakModule`.
- `sonarqube.service.ts` injecte GitLab et Vault ; écoute `project.upsert`/`project.delete`; `ensureUser`, `ensureProjectRepositories`, `ensureGitlabCiVariables` établissent les échanges décrits.
- `sonarqube-client.service.ts` porte les appels SonarQube ; `sonarqube.constants.ts` définit les permissions/groupes utilisés.
- `plugins/sonarqube/src/functions.ts` reçoit `vault` et `keycloak` dans `payload.apis`, utilise `KeycloakProjectApi.getProjectGroupPath()` et lit le secret `SONAR` via `VaultProjectApi`; `setVariables` consomme GitLab et Vault. Ces appels prouvent les coutures legacy au-delà des références déclaratives de `env.d.ts`.
