# Stratégie de Modularisation - console/server → console/server-nestjs

## 🎯 Approche globale

Sachant que nous avons des fonctionalités assez bien identifiées (AdminTokens, Plugin Gitlab, etc.), nous allons utiliser une approche « Modularisation par verticaux ».

### Principe

Plutôt que de migrer par couches horizontales (tous les DTOs, puis tous les services, puis tous les controllers, puis tous les plugins), nous migrerons **module complet par module complet**.

### Pourquoi cette approche ?

✅ **Valeur métier immédiate** : Chaque itération livre un module fonctionnel
✅ **Tests E2E possibles** : Validation complète de la non-régression dès la fin du module
✅ **Risque isolé** : Un problème n'affecte qu'un seul domaine métier
✅ **Rollback granulaire** : Retour arrière possible module par module
✅ **Équipe non bloquée** : Autres modules restent disponibles pour développement
✅ **Reprise du typage** : Beaucoup de modules ont un typage Typescript lacunaire, voire inexistant (`any`). Migrer un module sera l'opportunité de reprendre ces aspects et définir clairement l'"API" du Module

### Anatomie d'un vertical

```
ZoneModule (exemple)
├── Model (Prisma)          ← Déjà existant, partagé
├── Repository/Service      ← Modularisation du code métier
├── Controller/Routes       ← Modularisation des endpoints
├── DTOs & Validation       ← Ajout validation NestJS
├── Tests unitaires         ← Nouveaux tests Vitest
└── Tests E2E              ← Adaptation tests Playwright si besoin (normalement jamais)
```

## Phase 1: 📊 Cartographie et priorisation du code de console/server actuel

### Objectifs de la cartographie

1. **Inventaire exhaustif** : Lister tous les endpoints et leurs dépendances
2. **Graphe de dépendances** : Identifier les modules couplés entre eux (typiquement Vault et…tout le reste)
3. **Priorisation** : Définir l'ordre optimal de modularisation (de "bas en haut", donc de ceux qui ont le moins de dépendances à ceux qui dépendent de presque tout le monde)
4. **Estimation** : Évaluer grosse maille la charge de chaque module

### Outils d'analyse automatique

Une manière de faire qui combine une approche automatique (on parcourt tout ce qu'on peut) et une approche empirique (on regarde ce que ça donne) peut se faire de la manière suivante :

```bash
# 1. Installer les outils
npm install -D madge dependency-cruiser

# 2. Générer le graphe de dépendances
npx madge --image dependency-graph.png --extensions js,ts server/src

# 3. Détecter les cycles de dépendances
npx madge --circular --extensions js,ts server/src

# 4. Analyser les violations architecturales
npx depcruise src --output-type err
```

### Ordre de modularisation recommandé

**Stratégie en 3 phases** :

1. **Phase d'apprentissage (S3-S4)** : Modules simples mais critiques
   - Auth : Critique mais bien délimité
   - Objectif : Valider l'approche, former l'équipe

2. **Phase de vélocité (S5-S8)** : Modules métier principaux
   - Cluster, Zone, etc.
   - Objectif : Migrer le gros du trafic

3. **Phase de finalisation (S9-S12)** : Modules périphériques
   - Plugins qui doivent exister impérativement (Kubernetes, Gitlab, etc. -LISTE À DEFINIR-)
   - Objectif : Compléter la modularisation, suppression de `server` et renommage de `server-nestjs` en `server`

## 🔄 Gestion du passage simple singleton node.js → Injection de dépendances dans des services singleton

### Le problème des singletons purement "node.js"

Les singletons actuellement utilisés dans le code sont ceux de Node.js. Ce sont
des instances certes uniques, mais qui reposent intégralement sur une logique
d'import des fichiers. Cette logique n'est pas mauvaise en soi (et fonctionne
encore maintenant), mais elle est très limitée, car elle ne nous permet pas de
configurer les "modules" importés (changer une dépendance par une autre, par
exemple). Par essence les modules node.js ne permettent pas d'injection de
dépendance, en particulier au runtime.

```javascript
// ❌ Pattern singleton dans le code server
const prisma = require('../db').default;

async findById(id) {
  return prisma.user.findUnique({ where: { id } });
}

async create(data) {
  return prisma.user.create({ data });
}

// Export d'une instance unique (singleton)
module.exports = { findById, create };
```

**Problèmes** :
- État partagé mutable
- Difficile à tester (mocking complexe)
- Pas de contrôle du cycle de vie
- Couplage fort avec les dépendances
- Typage souvent lacunaire

### Solution : Migrer vers un vrai service singleton de type NestJS

```typescript
// nest-backend/src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  // Ajouter validation, transformation, logique métier
}
```

### Checklist de modularisation d'un singleton node.js -> singleton NestJS

Pour chaque service singleton node.js à migrer :

- [ ] **Identifier** : Lister tous les singletons node.js (grep `module.exports =` ou `export default`)
- [ ] **Analyser** : Documenter l'interface publique (méthodes exposées)
- [ ] **État mutable** : Identifier les propriétés d'instance partagées
- [ ] **Dépendances** : Lister ce dont le singleton dépend
- [ ] **Créer le service** : Reproduire l'interface du singleton en NestJS
- [ ] **Tests de contrat** : Valider la parité comportementale avant/après
- [ ] **Migrer progressivement** : Remplacer les usages un par un
- [ ] **Nettoyage** : Supprimer le singleton node.js une fois inutilisé

## 📝 Méthodologie de modularisation d'un module

### Processus en 7 étapes

#### 1. Analyse et préparation (Jour 1)

```bash
# Analyser les dépendances du module
npx madge --depends my-module old-server/src

# Lister les endpoints concernés
grep -r "router.*mymodule" old-server/src/routes

# Identifier les tests E2E existants
grep -r "my-module" playwright/tests/e2e
```

**Livrables** :
- Liste des routes/endpoints à migrer
- Graphe des dépendances
- Plan de tests

#### 2. Setup du nouveau module NestJS (Jour 1)

**Note**: Afin d'accélérer la création des entités NestJS (services, modules,
contrôleurs, etc.), on pourra utiliser [la CLI `nest`](https://docs.nestjs.com/cli/usages#nest-generate)
pour générer des modèles (*templates*).

```bash
# Générer le module avec NestJS CLI (par ex pour un module UserModule)
cd nest-backend
nest g module users
nest g controller users
nest g service users
```

**Structure créée** :
```
src/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
├── entities/
│   └── user.entity.ts
└── users.controller.spec.ts
```

#### 3. Modularisation de la logique métier (Jours 2-3)

**Ordre de modularisation** :
1. DTOs et contrat de validation, suivant les besoins (certains services ont
   besoin d'un DTO puisqu'ils utilisent la BDD, d'autres non)
2. Service (logique métier du module)
3. Controller (routes du module)
4. Guards et interceptors pour les contrôles qui peuvent être factorisés

#### 4. Écriture des tests unitaires pour le nouveau service (Jour 3)

#### 5. Adaptation des tests E2E si nécessaire (Jour 4)

#### 6. Configuration du nginx étrangleur et déploiement (Jour 5)

**Mise à jour de `nginx/routing.conf`** :

```nginx
# [S5-S6] Users - 2026-02-23
location /api/xxxxx {
    proxy_pass http://server-nest;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/yyyyy {
    proxy_pass http://server-nest;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Note: Prévoir un "blue-green" afin de permettre un passage souple et serein
entre les anciens et nouveaux services.

**Déploiement progressif** :

```bash
# 1. Backup de la config actuelle
cp nginx/routing.conf nginx/routing.conf.backup

# 2. Mise à jour de la config
# (éditer nginx/routing.conf)

# 3. Validation de la config nginx
docker-compose exec nginx nginx -t

# 4. Rechargement sans downtime
docker-compose exec nginx nginx -s reload

# 5. Monitoring (surveiller les logs pendant 5-10min)
docker-compose logs -f nginx | grep users
```

Note: Prévoir un retour arrière en cas de problème ⚠

#### 7. Monitoring et validation (Jours 5-7)

Note: Faire un point sur la métrologie existante. Envisager si besoin de
fiabiliser la stack d'observabilité, implémenter Loki et remonter des métriques
si besoin).

**Métriques à surveiller** :

```bash
# Logs en temps réel
docker-compose logs -f nest-api | grep users

# Taux d'erreur
docker-compose logs nest-api | grep ERROR | grep users | wc -l

# Temps de réponse moyen (exemple avec awk)
docker-compose logs nginx | grep "/api/users" | \
  awk '{print $NF}' | awk -F'=' '{sum+=$2; count++} END {print sum/count}'
```

**Validation** :
- [ ] Aucune erreur 5xx pendant 24h
- [ ] Temps de réponse comparable au code `server` (±20%)
- [ ] Tests E2E passants
- [ ] Recette utilisateurs (si applicable)

## 🚨 Gestion des situations complexes

### Cas 1 : Module avec beaucoup de dépendances

**Stratégie** :
1. Migrer d'abord les dépendances (Users, Products)
2. Créer des adaptateurs temporaires (des services "passe-plat") pour les modules qui ne sont pas encore migrés
3. Tester intensivement les interactions entre modules (typage fort, tests d'intégration, E2E, etc.)

## ✅ Checklist de fin de module

Avant de considérer un module comme "migré" :

- [ ] Tous les endpoints du module redirigent vers `server-nestjs`
- [ ] Tests de contrat passants (parité avec le code `server`)
- [ ] Tests E2E passants (éventuellement adaptés)
- [ ] Configuration nginx mise à jour et déployée
- [ ] Monitoring actif
- [ ] Aucune régression détectée
- [ ] Documentation technique à jour
- [ ] MODULARISATION_STATUS.md mis à jour
- [ ] Annonce de fin sur Mattermost
