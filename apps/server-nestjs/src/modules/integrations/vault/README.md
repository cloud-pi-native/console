# Vault

[← Index transversal de la cartographie](../../../../../docs/architecture/plugins.md)

## Périmètre et état de migration

Le module `vault` possède l’intégration à Vault : configuration des moteurs KV et auth, politiques ACL, AppRole, groupes d’identité et secrets de projet/zone. Plugin historique : `plugins/vault/src/`.

## Relations observées

### Sorties

| Fournisseur       | Finalité métier                                                      | Nature                     | Mécanisme observé                                                | Entrées → sorties                                          |
| ----------------- | -------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| Vault externe     | Appliquer politiques, auth, AppRole, groupes et secrets.             | fonctionnelle et technique | `VaultClientService` encapsule l’API HTTP Vault.                 | projet/zone/configuration → ressources Vault réconciliées. |
| Événements projet | Créer, réconcilier ou nettoyer les ressources Vault liées au projet. | fonctionnelle et technique | Écoute `project.upsert` et `project.delete`, résultats capturés. | `ProjectWithDetails` → résultat Vault OK/KO.               |
| Événements zone   | Réconcilier ou nettoyer les ressources Vault de zone.                | fonctionnelle et technique | Écoute `zone.upsert` et `zone.delete`, résultats capturés.       | `ZoneEventPayload { id, slug }` → résultat Vault OK/KO.    |

### Entrées

Les modules ci-dessous consomment directement le client Vault ; la fiche du consommateur est la preuve de l’appel et précise son intention métier :

- [ArgoCD](../argocd/README.md) : role-id/secret-id et configuration Vault destinée aux manifests de déploiement.
- [GitLab](../gitlab/README.md) : secrets GitLab, credentials de miroir, tokens techniques.
- [Nexus](../nexus/README.md) : identifiant et mot de passe du compte Nexus de projet.
- [Harbor (`registry`)](../registry/README.md) : secrets des robots Harbor.
- [SonarQube](../sonarqube/README.md) : utilisateur, mot de passe et token SonarQube.
- Le plugin Keycloak historique écrit le secret du client OIDC de zone via `apis.vault.write(..., 'keycloak')`. `keycloak.module.ts` n’importe pas `VaultModule` et le service Keycloak NestJS n’a pas de call site Vault établi : le stockage du secret est une couture legacy non portée à qualifier.

## Séquences métier

- **Projet** : `project.upsert` → configuration Vault et politiques/groupes/identités liés au projet ; `project.delete` → suppression des ressources Vault de projet.
- **Zone** : `zone.upsert` → synchronisation de ressources/politiques de zone ; `zone.delete` → nettoyage par slug.
- **Credentials consommés** : les autres modules lisent et écrivent des secrets via le client Vault pendant leurs propres opérations. Aujourd’hui ces appels s’adressent parfois à l’API générique KV et connaissent schéma ou chemin.

## Contrats cibles recommandés et delta

| Couture observée                                                                                                                                                                                                                  | Propriétaire cible                                                                                         | Contrat recommandé (proposition)                                                                                                                                                                                                                   | Garanties                                                                                                                                                            | Delta                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Les consommateurs NestJS injectent `VaultClientService`, certains types `VaultSecret<T>`, et connaissent des fonctions/chemins ; le plugin Keycloak legacy écrit aussi le secret du client OIDC de zone via son API projet Vault. | Vault possède transport, chemins et contrôles d’accès ; le producteur du secret possède son schéma métier. | Interfaces nommées par intention : `getDeploymentAccess`, `read/writeMirrorCredentials`, `read/writeNexusCredentials`, `read/writeHarborRobotSecret`, `read/writeSonarqubeCredentials`, et contrat pour le secret du client OIDC de zone Keycloak. | Aucun SDK/transport/path KV dans les consommateurs ; secret minimal, typé et masqué ; not-found distinct ; rotation, révocation, permissions et erreurs documentées. | Remplacer chaque appel générique par un contrat spécialisé ; porter ou réattribuer le stockage du secret OIDC de zone au cutover Keycloak ; inventorier lecteurs/écrivains, formats, durée de vie et rotations. Statut : `à arbitrer` ; priorité non déduite. |
| `VaultService` écoute aussi les événements projet/zone ; cette réconciliation est distincte du CRUD de secrets appelé par les plugins.                                                                                            | Vault pour les ressources Vault ; module métier pour le cycle de vie projet/zone.                          | Maintenir les événements de cycle de vie et séparer commandes d’administration Vault des ports consommateurs de secrets.                                                                                                                           | Les événements système ne sont pas confondus avec des requêtes ad hoc de credentials ; rejeu idempotent et statut des plugins.                                       | Documenter séparément événements de provisioning et ports de secret ; aucun contrat actuel ne remplace encore les appels consommateurs.                                                                                                                       |

## Preuves et limites

- `vault.module.ts` ne dépend pas des modules GitLab, Nexus, Registry, ArgoCD ou SonarQube ; les dépendants importent VaultModule.
- `vault.service.ts` implémente les quatre écouteurs projet/zone, configuration et cycle de vie des ressources Vault.
- `vault-client.service.ts`, `vault-http-client.service.ts` et `vault.utils.ts` portent client, transport et générateurs de chemins/types spécifiques.
- Les call sites directs sont référencés par les fiches consommatrices ; les noms de secret cités ici doivent être maintenus synchronisés avec ces preuves.
- `plugins/keycloak/src/functions.ts` écrit le secret du client de zone via `apis.vault.write(..., 'keycloak')` ; ce comportement legacy est absent du module Keycloak NestJS examiné.
- `plugins/vault/src/` n’a pas de fichier `env.d.ts` déclarant d’autres plugins. Cela n’exclut pas des liens runtime ailleurs dans son code ; tout lien additionnel doit avoir un call site cité avant d’être ajouté.
