# Backend Console

Backend NestJS avec Fastify et Prisma. Le client le joint directement sur le port `3001`, via Vite en développement ou le Nginx client dans les stacks conteneurisées.

La configuration des environnements et les commandes de démarrage sont décrites dans [ENVIRONMENTS.md](../../ENVIRONMENTS.md).

## Architecture

- `src/main.module.ts` compose les modules de l’application.
- `src/modules/core/` contient les domaines métier : contrôleurs, services et fonctions de requête Prisma.
- `src/modules/infrastructure/` fournit les services transverses : authentification, base de données, permissions et journalisation.
- `src/modules/integrations/` contient les intégrations avec les outils externes.
- `src/config/` définit les configurations injectées dans les services.
- Les contrats HTTP, schémas et permissions sont partagés avec le client via `@cpn-console/shared`.

Les conventions de contribution et de test sont décrites dans [AGENTS.md](../../AGENTS.md).

## Fixtures de développement et de test

**Cette commande efface les données de la base ciblée. Utiliser uniquement une base jetable.**
Arrêter le backend avant une réinitialisation manuelle pour éviter des écritures concurrentes.
Elle ne charge aucun fichier `.env` : fournir explicitement `DB_URL`, `NODE_ENV=development`
ou `NODE_ENV=test`, et l’argument `--reset`. Les modes production et intégration sont refusés,
y compris avec `CI=true`.

Depuis la racine, après installation des dépendances, compilation de `@cpn-console/test-utils`
(et de ses dépendances workspace) et génération du client Prisma :

```bash
# Base locale jetable, préalablement démarrée.
DOCKER=true INTEGRATION=false DB_URL=postgresql://admin:admin@localhost:5432/fixtures \
  pnpm --dir apps/server-nestjs run db:deploy
NODE_ENV=test DB_URL=postgresql://admin:admin@localhost:5432/fixtures \
  pnpm --dir apps/server-nestjs run db:fixtures --reset
```

Les données proviennent de `packages/test-utils/src/imports/data.ts`. Leur remplacement est
transactionnel : une erreur annule l’ensemble des suppressions et des insertions.
`loadFixtures()` charge et convertit le dataset depuis `src/prisma/fixtures-testing.utils.ts` ;
`resetFixtures(prisma)` le réimporte dans une transaction. Les tests de rollback peuvent fournir
un dataset modifié en second argument. La configuration destructive est isolée dans
`src/config/fixtures.config.ts`, sans chargement implicite de l’environnement.
Le point d’entrée `db:fixtures` ne fait que vérifier la configuration, ouvrir le client et le fermer.
Cet outillage est exclu de la compilation de production ; le démarrage normal du backend ne le déclenche jamais.

La stack CI utilise le service ponctuel `fixtures`, construit depuis la cible Docker de test
homonyme, avant de démarrer le backend. Il applique les migrations NestJS puis importe les
données. `pnpm docker:e2e-ci` construit cette cible même lorsque les images applicatives sont
fournies par `TAG`. Cette image de test n’est pas publiée.

Pour rejouer les tests PostgreSQL sur une base jetable où les migrations ont été appliquées :

```bash
E2E=true FIXTURES_TEST_DB_URL=postgresql://admin:admin@localhost:5432/fixtures \
  pnpm --dir apps/server-nestjs exec vitest run src/config/fixtures.config.spec.ts src/prisma/fixtures-testing.utils.spec.ts test/fixtures.database.e2e-spec.ts
```
