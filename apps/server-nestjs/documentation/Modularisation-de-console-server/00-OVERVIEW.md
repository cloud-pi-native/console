# Modularisation Backend : Node.js Server → NestJS

## 🎯 Objectifs de la modularisation

### Principes directeurs

- La Console a évolué très rapidement. Depuis sa création jusqu'à récemment, la
  priorité a été donnée à l'ajout de fonctionnalités, sans forcément avoir le
  temps de consolider le socle technique. La modularisation de sa partie
  serveur, à l'aide d'un framework robuste comme NestJS, permettra une
  évolution saine de la plate-forme.
- Il y a une volonté de permettre davantage de souplesse dans la configuration
  de la console (utilisation d'un plugin en remplacement d'un autre), afin de
  permettre aux projets qui voudraient avoir "leur" console de la configurer
  comme ils veulent
- Le code du serveur de la console est assez daté, dans ses paradigmes et ses
  dépendances. Un nettoyage de ce code par une remise à plat de la cartographie
  des interdépendances entre les différents modules permettra d'améliorer les
  choses module par module

### Objectifs techniques
- **Modularisation** : Découpage en modules métier cohérents et maintenables
- **Architecture propre** : Injection de dépendances, séparation des responsabilités
- **Scalabilité** : Base solide pour les évolutions futures
- **Qualité code** : Standards NestJS, TypeScript strict

### Objectifs organisationnels
- **Continuité produit** : Zéro impact sur les développements en cours
- **Montée en compétence** : Équipe formée progressivement à NestJS
- **Risque maîtrisé** : Modularisation progressive sans interruption de service

## 📊 Contexte technique

### Stack actuelle
- **Backend** : Node.js (avec ts-rest/fastify et injection de dépendance manuelle des plugins)
- **ORM** : Prisma avec PostgreSQL
- **Auth** : OIDC avec Keycloak
- **Tests** : Playwright (E2E), Vitest (unitaires)
- **Déploiement** : Docker Compose
- **CI/CD** : Pipeline existante

### Stack cible
- **Backend** : NestJS (TypeScript)
- **ORM** : Prisma (conservé, partagé)
- **Auth** : OIDC Keycloak
- **Tests** : Playwright + Vitest (conservés)
- **Déploiement** : Docker Compose (phase transition) → NestJS seul
- **CI/CD** : Adaptée pour build et le déploiement des 2 images en parallèle

### Métriques du projet
- **Routes** : ~100
- **Équipe** : ~5 développeurs
- **Timeline** : 3 mois (12 sprints)
- **Couverture tests E2E** : 33% → objectif 50%

## 🏗️ Stratégie : Strangler Fig Pattern

### Principe
Le nouveau backend `server-nestjs` coexiste avec l'ancien et "étouffe" progressivement `server` en reprenant route par route ses fonctionnalités.

### Pourquoi cette approche ?
✅ **Zero downtime** : Service continu pendant la modularisation
✅ **Rollback facile** : Retour arrière immédiat via configuration nginx
✅ **Équipe non bloquée** : Développements possibles en parallèle
✅ **Validation progressive** : Tests en prod sur petit périmètre
✅ **Risque maîtrisé** : Pas de big bang

### Architecture de transition

```
┌─────────────┐
│   Nginx     │ ← Point d'entrée unique (port 80)
│  (Reverse   │
│   Proxy)    │
└──────┬──────┘
       │
       ├─────────────┐
       │             │
     Migré        Pas encore
       │             │
       │             │
┌──────▼──────┐ ┌────▼───────┐
│ NestJS API  │ │ Server API │
│   (3001)    │ │ (3000)     │
└──────┬──────┘ └────┬───────┘
       │             │
       └─────────────│
                     │
              ┌──────▼─────┐
              │ PostgreSQL │
              │  (Prisma)  │
              └────────────┘
```

## 📋 Documents de référence

Cette modularisation est documentée dans plusieurs fichiers :

1. **[00-OVERVIEW.md](00-OVERVIEW.md)** *(ce document)* - Vue d'ensemble
3. **[01-MODULARISATION-STRATEGY.md](01-MODULARISATION-STRATEGY.md)** - Stratégie et méthodologie
7. **[MODULARISATION_STATUS.md](MODULARISATION_STATUS.md)** - Suivi en temps réel (fichier vivant)
8. **[MODULARISATION_MAP.md](MODULARISATION_MAP.md)** - Cartographie des modules (fichier vivant)

## 🚀 Démarrage rapide

### Pour l'équipe de développement
1. Lire ce document (OVERVIEW)
2. Consulter [MODULARISATION\_STATUS.md](MODULARISATION_STATUS.md) pour connaître l'état actuel
3. Suivre le canal Mattermost `#backend-modularisation`
4. Respecter les zones en modularisation (🚧) avant de développer

### Pour le lead technique de la modularisation
1. Lire tous les documents dans l'ordre
2. Personnaliser [MODULARISATION\_MAP.md](MODULARISATION_MAP.md) avec la cartographie réelle
3. Configurer l'infrastructure
4. Lancer la communication

## 🎯 Principes directeurs

### Technique
- **Parité fonctionnelle** : Chaque route migrée doit être strictement équivalent à son prédécesseur
- **Tests de contrat** : Validation automatique de la parité comportementale
- **Monitoring** : Surveillance continue des performances et erreurs
- **Documentation** : Chaque décision architecturale documentée (ADR)

### Organisationnel
- **Communication proactive** : Annonce claire des zones en modularisation
- **Collaboration** : "Pair programming" encouragé pour montée en compétence
- **Pragmatisme** : Adapter le planning selon les contraintes business
- **Célébration** : Reconnaître les étapes franchies

## ⚠️ Règles critiques

### À FAIRE
✅ Annoncer début/fin de modularisation d'un module sur Mattermost
✅ Mettre à jour MODULARISATION\_STATUS.md à chaque changement
✅ Écrire des tests de contrat avant de migrer une route
✅ Déployer progressivement (intégration → staging → prod)
✅ Monitorer 24-48 h après chaque modularisation

### À NE PAS FAIRE

❌ Migrer un module pendant qu'une fonctionnalité y est développée
❌ Modifier le schéma Prisma pendant la modularisation (sauf critique)
❌ Déployer sans tests E2E passants
❌ Oublier de mettre à jour la config nginx pour indiquer la bascule d'une route
❌ Développer sur `server` (et pas sur `server-nestjs`) un module déjà migré

## 📞 Contacts

### Responsable modularisation
- **Lead technique** : @stephane.trebel
- **Canal Mattermost** : #backend-modularisation
- **Réunions** : Hebdo modularisation (les jeudis à 10h, 30 min)

### Escalade
- **Problème technique bloquant** : Contacter @lead-dev immédiatement
- **Conflit de développement** :  Contacter @lead-dev immédiatement
- **Incident de Production** : Retour en arrière Nginx sur la route concernée

## 📈 Métriques de succès

### Fin de modularisation (sprint 12)
- [ ] 100% des routes migrées sur NestJS
- [ ] code de `server` supprimé du dépôt Git de `console`
- [ ] Couverture des Tests E2E ≥ 50% des cas d'usage de `console`
- [ ] Documentation technique complète des modules (cartographie, dépendances inter-modules, etc.)
- [ ] 0 régression fonctionnelle
- [ ] Équipe autonome sur NestJS

### Indicateurs intermédiaires
- **S4** : 20% migré (Modules transverses (logger, configuration, etc.))
- **S6** : 40% migré (Modules "verticaux" comme Zone, Cluster, etc.)
- **S8** : 60% migré
- **S10** : 80% migré (Plugins, comme ArgoCD, Gitlab, etc.)
- **S12** : 100% migré

## 🗓️ Dates clés

- **S1-S2** : Cartographie et setup
- **S3-S4** : Modularisation des modules transverses
- **S5-S6** : Modularisation des modules métiers "cœur" (Zone, Cluster, etc.)
- **S7-S10** : Modularisation modules plugins (ArgoCD, Gitlab, etc.)
- **S11-S12** : Finalisation et nettoyage du code (suppression reverse proxy, suppression de `server`, etc.)

*Dates indicatives, ajustables selon les contraintes business*

## 📚 Ressources

### Documentation NestJS

- [Documentation officielle NestJS](https://docs.nestjs.com/)
- [Prisma avec NestJS](https://docs.nestjs.com/recipes/prisma)
- [Authentification OIDC NestJS](https://docs.nestjs.com/recipes/passport)

### Outils

- [Madge](https://github.com/pahen/madge) - Analyse de dépendances
- [Compodoc](https://compodoc.app/) - Documentation auto
- [Playwright](https://playwright.dev/) - Tests E2E
- [Vitest](https://vitest.dev/) - Tests unitaires

---

**Version** : 1.0
**Dernière mise à jour** : 2026-01-07
**Prochaine revue** : Fin S2
