# Architecture d’un module (pattern `apps/server-nestjs/src/modules/*`)

Les modules NestJS métier vivent dans `src/modules/<nom-du-module>/` et suivent un découpage “vertical slice” avec des responsabilités explicites : **client**, **service**, **controller service (orchestration)**, **datastore**, **utils** et **tests**.

Exemples concrets :
- Module GitLab : `src/modules/gitlab/`
- Module Keycloak : `src/modules/keycloak/`

## Structure type

```txt
src/modules/<module>/
├── <module>.module.ts
├── <module>.constants.ts
├── <module>-client.service.ts
├── <module>.service.ts
├── <module>-controller.service.ts
├── <module>-datastore.service.ts
├── <module>.utils.ts
├── <module>-testing.utils.ts
└── *.spec.ts
```

## Sens des dépendances (flow recommandé)

Objectif : un flux de dépendances lisible et sans cycles.

```txt
<module>-controller.service.ts
        ↓
     <module>.service.ts
      ↙          ↘
<module>-client   <module>-datastore
.service.ts       .service.ts
```

Règles pratiques :
- Le `controller service` orchestre des workflows (cron, events, reconcile) et appelle le `service` et/ou le `datastore`.
- Le `service` contient les règles métier (décisions, transformations, validations) et s’appuie sur le `client` et le `datastore`.
- Le `client` encapsule l’accès à une API externe (initialisation + appels + erreurs bas niveau).
- Le `datastore` encapsule l’accès DB (Prisma) et expose des méthodes de lecture/écriture typées.
- Les `utils` restent “purs” (pas d’IO, pas d’injection Nest).
- Les `testing utils` centralisent les factories/fixtures pour réduire la duplication dans les tests.

## Composants

### `<module>.module.ts`

Rôle :
- Déclare les providers, imports, exports du module.
- Exporte généralement le service principal du module.

### `<module>-client.service.ts`

Rôle :
- Adapter vers le système externe (SDK HTTP, client Keycloak, client GitLab, etc.).
- Conserver un contrat stable pour le reste du module.
- Mapper/normaliser les erreurs externes si nécessaire.

À éviter :
- Décisions métier (permissions, synchronisation, règles de purge) : elles vont dans `<module>.service.ts` ou le controller service.

### `<module>.service.ts`

Rôle :
- Coeur métier du module (logique, mapping, validations, règles).
- Appels aux dépendances (client/datastore) via des méthodes orientées domaine.

À éviter :
- Cron/events : c’est le rôle du controller service.

### `<module>-controller.service.ts`

Rôle :
- Orchestrateur de workflows : `@Cron`, `@OnEvent`, reconcile périodique, tâches “batch”.
- Coordination entre datastore et service (et parfois appels directs au client pour des opérations transverses).
- Garde-fous “safety” avant opérations destructrices (ex: suppression de groupes orphelins).

### `<module>-datastore.service.ts`

Rôle :
- Accès DB via Prisma (select/include, transactions, pagination).
- Exposition de types agrégés utiles au domaine (ex: `ProjectWithDetails`).

À éviter :
- Appliquer des règles métier (ex: calcul de permissions) : on garde le datastore centré persistence.

### `<module>.utils.ts`

Rôle :
- Fonctions utilitaires pures : mapping, helpers de collections, types partagés.
- Aucune dépendance Nest, aucune lecture/écriture DB, aucun appel réseau.

### `<module>-testing.utils.ts`

Rôle :
- Factories typées pour les structures fréquemment utilisées en tests.
- Support d’`overrides` pour construire rapidement des variantes.
- Centralisation des erreurs/fake responses spécifiques au module (quand utile).

## Tests (Vitest)

### `<module>.service.spec.ts`

Cible :
- Logique métier : transformations, décisions, mapping d’erreurs.

Approche :
- Mock du `client` et du `datastore`.
- Pas d’IO réel.

### `<module>-controller.service.spec.ts`

Cible :
- Orchestration : séquences d’appels, side-effects attendus, reconcile.

Approche :
- Mock du `service`, du `datastore`, et des appels externes.
- Vérification des appels effectués et des paramètres attendus.

### `<module>-datastore.service.spec.ts` (si présent)

Cible :
- Forme des requêtes Prisma, mapping de résultat, typage de l’agrégat renvoyé.

Approche :
- Mock de Prisma/DatabaseService, pas de logique métier.
