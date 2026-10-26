# Harbor (`registry`)

[← Index transversal de la cartographie](../../../../../../docs/architecture/plugins.md)

## Périmètre et état de migration

Le module NestJS s’appelle `registry`, tandis que le plugin historique et le service externe correspondent à Harbor. Il gère le projet de registre, les robots, permissions, membres de groupe, quotas et politique de rétention. Plugin historique : `plugins/harbor/src/`.

## Relations observées

### Sorties

| Fournisseur       | Finalité métier                                                            | Nature                     | Mécanisme observé                                                                                                     | Entrées → sorties                                                                                 |
| ----------------- | -------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Vault             | Conserver et relire les credentials des robots Harbor publiés aux projets. | fonctionnelle et technique | Injection `VaultClientService` dans `RegistryService` et `RegistryPluginService`.                                     | projet + robot → secret robot stocké sous un chemin de projet puis exposé au plugin si configuré. |
| Harbor externe    | Créer/réconcilier projets, robots, membres, quota, rétention et dépôts.    | fonctionnelle et technique | `RegistryClientService` / client HTTP Harbor.                                                                         | données projet et politique → ressources Harbor.                                                  |
| Événements projet | Provisionner ou nettoyer les ressources Harbor du projet.                  | fonctionnelle et technique | Écoute `project.upsert` et `project.delete`, résultats capturés comme `harbor`.                                       | `ProjectWithDetails` → résultat plugin Harbor OK/KO.                                              |
| Groupes Keycloak  | Aligner les membres Harbor avec les chemins OIDC du projet et des rôles.   | fonctionnelle et technique | `generateAccessLevelMapping` construit les chemins, `ensureProjectGroupMembers` les applique sans injection Keycloak. | `/${project.slug}` et chemins configurés → membres de groupe et rôles Harbor.                     |

### Entrées

- `project.upsert` crée ou réconcilie le projet Harbor, ses paramètres, groupes, robots et secrets selon la configuration.
- `project.delete` supprime projet et ressources Harbor correspondantes.
- Harbor historique consomme `VaultProjectApi` pour gérer les secrets de robot et `KeycloakProjectApi.getProjectGroupPath()` pour calculer `/${project.slug}`. NestJS conserve ce membre racine dans `generateAccessLevelMapping`, avec `HARBOR_ROLE_LIMITED_GUEST`, et ajoute les groupes de rôles projet/plateforme. Le lien fonctionnel avec les groupes Keycloak demeure par convention de nommage, sans injection `KeycloakModule`.
- Les permissions ne sont pas déductibles de cette absence d’import : le legacy utilise par défaut le rôle Harbor `3` dans `addProjectGroupMember`, NestJS applique une matrice racine/rôles configurables. C’est une évolution des droits à comparer, pas une disparition de l’ajout de groupe.

## Séquences métier

- **Réconciliation projet** : événement projet → ensure du projet Harbor → membres/quotas/rétention/robots → lecture ou écriture de secrets de robot dans Vault.
- **Déprovisionnement** : `project.delete` entraîne Registry à supprimer le projet/dépôts Harbor ; parallèlement, le listener Vault `project.delete` supprime les secrets sous le projet, dont les credentials robot. Registry n’appelle pas directement Vault pour nettoyer les secrets au déprovisionnement.
- **Exposition plugin** : lors de la lecture des secrets, le service résout le projet Harbor puis demande à Vault les secrets de registry. La surface plugin consomme donc le stockage Vault sans devenir propriétaire du chemin Vault.

## Contrats cibles recommandés et delta

| Couture observée                                                                                                                                      | Propriétaire cible                                                                    | Contrat recommandé (proposition)                                                                                                                    | Garanties                                                                                                                      | Delta                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry fabrique le chemin Vault et utilise `read`/`write` génériques pour les secrets robot.                                                        | Vault possède chemins/transport ; Harbor possède le sens du robot et ses permissions. | `getHarborRobotCredentials(project, robotKind)` et `storeHarborRobotCredentials(...)`, éventuellement via contrat dédié d’identifiants de registre. | Typage secret et usage, permissions minimales, chemin masqué, rotation atomique/rollback si robot recréé, not-found distingué. | Cesser de construire le chemin Vault dans Registry ; traiter le cas actuel de suppression/recréation du robot sans perdre le secret d’accès. Statut : `à arbitrer`.                                                                                                        |
| Le module s’appelle `registry` tandis que l’intégration externe est Harbor.                                                                           | Module Registry, exposant explicitement l’identité fonctionnelle Harbor.              | Conserver le nom de code si souhaité, mais documenter/exporter des contrats métier Harbor/registry non ambigus.                                     | Aucun mélange avec d’autres types de registre ; vocabulaire API stable pour les consommateurs.                                 | Décider si la divergence de noms reste interne ou si les providers/configs/types doivent être renommés ; pas de renommage prescrit par la cartographie.                                                                                                                    |
| Registry ajoute déjà le groupe racine `/${project.slug}` et des groupes de rôles construits localement ; le lien technique Keycloak legacy a disparu. | Keycloak possède les groupes ; Harbor possède membres et permissions.                 | Convention partagée de chemins, ou port d’identité si une requête métier est nécessaire.                                                            | Concordance avec les groupes provisionnés, droits Harbor explicites, sans fuite du SDK.                                        | Conserver la distinction nommage/permissions : racine en `HARBOR_ROLE_LIMITED_GUEST`, matrice de rôles configurables, contre rôle `3` par défaut en legacy. Centraliser le nommage si nécessaire, sans recréer un ajout de groupe déjà présent. Statut : `cible proposée`. |

## Preuves et limites

- `registry.module.ts` importe `VaultModule`, configure `harborConfigFactory` et fournit les services Registry.
- `registry.service.ts` écoute `project.upsert`/`project.delete` avec le nom plugin `harbor` ; `ensureRobotSecret` construit un chemin Vault, puis lit/écrit les credentials. Le nettoyage de projet/zone des secrets est assuré par les écouteurs de `VaultService` (`deleteProjectSecrets`/`deleteZone`), pas par Registry directement.
- `registry-plugin.service.ts` utilise Vault pour la surface `secrets` et `RegistryClientService` pour résoudre le projet Harbor.
- `plugins/harbor/src/robot.ts` utilise `VaultProjectApi` pour lire, écrire et détruire les secrets de robot ; `functions.ts` appelle `KeycloakProjectApi.getProjectGroupPath()` puis `permission.ts:addProjectGroupMember` (rôle `3` par défaut).
- `plugins/keycloak/src/class.ts:getProjectGroupPath` renvoie `/<slug>` sans appel externe ; `registry.service.ts` (`generateAccessLevelMapping`, `ensureProjectGroupMembers`, `ensureProjectGroupMember`) ajoute déjà ce chemin racine et les chemins de rôles avec les permissions calculées. Le comportement subsiste sans import Keycloak.
