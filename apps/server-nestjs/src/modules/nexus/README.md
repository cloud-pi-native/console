# Nexus

[← Index transversal de la cartographie](../../../../../docs/architecture/plugins.md)

## Périmètre et état de migration

Le module `nexus` synchronise les dépôts Maven/npm, privilèges, rôles et comptes de service Nexus associés aux projets. Plugin historique : `plugins/nexus/src/`.

## Relations observées

### Sorties

| Fournisseur       | Finalité métier                                                  | Nature                     | Mécanisme observé                                                                                             | Entrées → sorties                                                                |
| ----------------- | ---------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Vault             | Conserver le compte de service Nexus projet et son mot de passe. | fonctionnelle et technique | Injection `VaultClientService`, lecture du secret avant réconciliation puis écriture après création/rotation. | projet → `NEXUS_USERNAME`/`NEXUS_PASSWORD` dans le chemin calculé par le module. |
| Nexus externe     | Gérer dépôts et droits de publication/lecture.                   | fonctionnelle et technique | `NexusClientService` / client HTTP Nexus.                                                                     | projet, dépôts → dépôts, privilèges, rôles et utilisateurs Nexus.                |
| Événements projet | Synchroniser ou supprimer les ressources projet.                 | fonctionnelle et technique | Écoute `project.upsert` et `project.delete`, résultats capturés.                                              | `ProjectWithDetails` → résultat Nexus OK/KO.                                     |

### Entrées

- `project.upsert` assure les ressources Nexus du projet puis recalcule les rôles plateforme.
- `project.delete` supprime les ressources du projet puis recalcule les rôles plateforme.
- Le plugin legacy lit/écrit ses credentials via `payload.apis.vault` (`NEXUS`), ce qui établit une couture fonctionnelle et technique Vault déjà présente avant NestJS. Il référence aussi des types GitLab, mais aucun appel GitLab runtime n’est établi dans les fichiers parcourus. Le module NestJS `nexus` n’importe que Vault parmi ces modules.

## Séquences métier

- **Réconciliation** : événement projet → dépôts/profils de droits Nexus → création ou mise à jour du compte projet → lecture/écriture du mot de passe dans Vault.
- **Déprovisionnement** : événement projet delete → suppression des ressources et secrets associés → recalcul des rôles plateforme.
- **Rôles plateforme** : l’ajout/retrait d’un projet influe sur les rôles globaux que Nexus doit conserver ; l’orchestration est interne au module Nexus et ses sources sont citées plus bas.

## Contrats cibles recommandés et delta

| Couture observée                                                                                                                | Propriétaire cible                                                                                           | Contrat recommandé (proposition)                                                                                                       | Garanties                                                                                                | Delta                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nexus construit et lit un chemin Vault, et passe par des opérations génériques pour persister les credentials du compte projet. | Vault possède le stockage et les contrôles d’accès ; Nexus possède le schéma fonctionnel de ses credentials. | API Vault spécialisée `getNexusProjectCredentials(project)` / `putNexusProjectCredentials(project, credentials)` / suppression dédiée. | Secret typé, chemins cachés, idempotence, erreurs not-found séparées et politique de rotation explicite. | Supprimer la connaissance du chemin KV et les types génériques de Vault du service Nexus ; qualifier qui déclenche une rotation. Statut : `à arbitrer`. |
| `project.upsert` et `project.delete` entraînent plusieurs opérations externes et un recalcul des rôles globaux.                 | Nexus reste propriétaire de la réconciliation Nexus ; le module métier possède le cycle projet.              | Conserver le contrat événementiel projet, avec résultats plugin isolés ; ne pas exposer de client Nexus à d’autres modules.            | Réconciliation rejouable, nettoyage par slug stable, erreur Nexus identifiable au niveau plugin.         | Aucune nouvelle relation inter-plugin démontrée ; vérifier le lien GitLab historique avant d’ajouter un port.                                           |

## Preuves et limites

- `nexus.module.ts` importe `VaultModule`, pas `GitlabModule`.
- `nexus.service.ts` : injection Vault, écouteurs `project.upsert`/`project.delete`, `ensureUser`, lectures/écritures Vault et opérations Nexus.
- `nexus-client.service.ts` et `nexus-http-client.service.ts` portent l’API Nexus.
- `plugins/nexus/src/project.ts` lit et écrit les credentials `NEXUS` via l’API projet Vault ; `plugins/nexus/src/env.d.ts` référence aussi GitLab, sans call site runtime GitLab établi. Aucun lien GitLab NestJS direct n’est observé dans le module.
