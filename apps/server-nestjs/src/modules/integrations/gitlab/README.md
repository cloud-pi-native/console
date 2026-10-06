# GitLab

[← Index transversal de la cartographie](../../../../../docs/architecture/plugins.md)

## Périmètre et état de migration

Le module `gitlab` possède l’intégration aux groupes, utilisateurs, dépôts, variables CI/CD, miroirs et pipelines GitLab. Plugin historique : `plugins/gitlab/src/`.

## Relations observées

### Sorties

| Fournisseur       | Finalité métier                                                                     | Nature                     | Mécanisme observé                                                                     | Entrées → sorties                                                                       |
| ----------------- | ----------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Vault             | Conserver les secrets de mirroring et les tokens qui ne sont pas persistés en base. | fonctionnelle et technique | Injection `VaultClientService` dans `GitlabService` et `GitlabPluginService`.         | slug/dépôt → secrets de miroir, trigger et credentials techniques lus/écrits/supprimés. |
| GitLab externe    | Créer et réconcilier groupes, membres, dépôts, variables, tokens et pipelines.      | fonctionnelle et technique | `GitlabClientService` encapsule l’API GitLab.                                         | projet et configuration métier → ressources GitLab.                                     |
| Événements projet | Réconcilier/nettoyer les ressources et déclencher un miroir.                        | fonctionnelle et technique | Écoute `project.upsert`, `project.delete`, `repository.sync` avec résultats capturés. | `ProjectWithDetails` ou `RepositorySyncEventPayload` → résultat GitLab OK/KO.           |

### Entrées

- `project.upsert` synchronise le groupe du projet, ses membres, dépôts et secrets/variables nécessaires.
- `project.delete` supprime le groupe et ses ressources selon la réconciliation du module.
- `repository.sync` déclenche le pipeline miroir pour le dépôt et la branche indiqués.
- ArgoCD consomme actuellement `GitlabClientService` pour lire et committer des fichiers de manifests. SonarQube consomme le même client pour ses dépôts et variables. Observability consomme GitLab pour ses dépôts de configuration. Ces appels directs sont décrits comme dépendances sortantes du consommateur dans les [fiches ArgoCD](../argocd/README.md) et [SonarQube](../sonarqube/README.md) ; Observability n’est pas l’une des sept fiches.
- GitLab est le propriétaire métier des fichiers, dépôts et variables GitLab. Un consommateur ne devrait pas administrer ces ressources au travers de son client technique.

## Séquences métier

- **Réconciliation projet** : `project.upsert` → groupes et membres → ressources de dépôts → synchronisation des configurations projet et secrets Vault nécessaires.
- **Déprovisionnement** : `project.delete` → retrait des ressources associées et nettoyage des secrets concernés.
- **Synchronisation dépôt** : `repository.sync` → `triggerMirror(projectSlug, internalRepoName, syncAllBranches, branchName?)` → pipeline miroir GitLab.
- **Credentials de dépôt** : le module `repository` écrit/supprime dans Vault les credentials explicitement modifiés avant d’émettre `project.upsert`. GitLab peut ensuite lire les credentials existants pour appliquer le miroir.

## Contrats cibles recommandés et delta

| Couture observée                                                                                                  | Propriétaire cible                                                                                | Contrat recommandé (proposition)                                                                                                                                                                     | Garanties                                                                                                                            | Delta                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VaultClientService` générique stocke plusieurs secrets GitLab (mirrors, token de pipeline et secrets du plugin). | Vault pour le stockage ; GitLab pour l’intention d’usage et le schéma des credentials GitLab.     | Ports spécialisés côté consommateur/fournisseur, p. ex. `readMirrorCredentials(project, repository)`, `writeMirrorCredentials(...)`, `deleteMirrorCredentials(...)`, `rotateMirrorTrigger(project)`. | Schéma typé, absence de fuite des chemins KV, erreurs `not found` distinctes des erreurs d’accès, secret masqué dans logs/résultats. | Remplacer lectures/écritures génériques et définir la propriété et le cycle de rotation de chaque secret. Le module `repository` doit utiliser le même contrat pour l’intention utilisateur. Statut : `à arbitrer`. |
| ArgoCD, SonarQube et Observability appellent des méthodes bas niveau de `GitlabClientService`.                    | GitLab.                                                                                           | API métier GitLab limitée aux commandes nécessaires : `upsertDeploymentManifest`, `ensureSonarAnalysisRepository`, `ensureObservabilityRepository` ; éviter l’exposition générique CRUD du client.   | Chaque opération possède sa ressource, est idempotente, et renvoie un résultat sans type GitLab SDK.                                 | Introduire les frontières et migrer les consommateurs ; éviter de simplement déplacer l’accès au client. Statut : `cible proposée`.                                                                                 |
| `repository.sync` est émis par le module Repository et actuellement consommé par GitLab seul.                     | GitLab pour l’action de synchronisation de miroir ; Repository pour le déclenchement utilisateur. | Conserver une commande de domaine dédiée de sync, avec l’union explicite full-sync/branch-sync.                                                                                                      | Distinguer aucune intégration active, échec GitLab et succès ; support du rejeu.                                                     | Confirmer l’événement comme contrat de module plutôt qu’un détail de plugin, puis versionner son payload si nécessaire. Statut : `à arbitrer`.                                                                      |

## Preuves et limites

- `gitlab.module.ts` importe `VaultModule` ; `gitlab.service.ts` injecte GitLab et Vault, écoute les trois événements, et accède aux miroirs/secrets.
- `gitlab-plugin.service.ts` lit les secrets GitLab dans Vault pour les exposer via le panneau du plugin.
- `gitlab-client.service.ts` expose les opérations GitLab consommées par ses clients internes et les autres modules ; `argocd.module.ts`, `sonarqube.module.ts` et `observability.module.ts` confirment les imports NestJS.
- Le plugin historique `plugins/gitlab/src/repositories.ts` lit, écrit et détruit les credentials de miroir via `VaultProjectApi`; `plugins/gitlab/src/class.ts` gère aussi les secrets du miroir global et le token de déclenchement. Ce sont des appels runtime, pas seulement des références déclaratives de `env.d.ts`.
- Les opérations d’administration au clic et les secrets exposés par `GitlabPluginService` ne sont pas toutes des séquences `project.*` ; cette fiche décrit les coutures inter-modules, pas chaque endpoint.
