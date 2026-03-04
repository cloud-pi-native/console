# Documentation de Modularisation du Backend de Console (apps/server) vers NestJS

Ce dossier contient toute la documentation nécessaire pour mener à bien la modularisation du backend Node.js vers NestJS.

## 📁 Structure de la documentation

### Documents principaux (à lire dans l'ordre)

1. **00-OVERVIEW.md** - Vue d'ensemble du projet de modularisation
   - Objectifs et contexte
   - Stratégie "Strangler Pattern"
   - Principes directeurs
   - Métriques de succès

2. **01-TECHNICAL-SETUP.md** - Configuration technique détaillée
   - Configuration Nginx (reverse proxy) qui va progressivement "étrangler" `server` au profit de `server-nestjs`
   - Gestion Prisma/BDD partagée entre `server` et `server-nestjs`
   - Déploiement `docker compose`

3. **02-MODULARISATION-STRATEGY.md** - Stratégie et méthodologie
   - Modularisation par slices verticales
   - Cartographie et priorisation
   - Gestion singletons → Injection de dépendances
   - Méthodologie en 7 étapes par module
   - Architecture Decision Records (ADR)

4. **03-PLANNING.md** - Planning détaillé sur les prochains sprints
   - Découpage sprint par sprint
   - Sprints 1-2 : Fondations
   - Sprints 3-4 : Modules transverses de `server` (logger, etc.)
   - Sprints 5-6 : Modules applicatifs (Zones, Clusters, etc.)
   - Sprints 7-10 : Modules métier (les fameux plugins)
   - Sprints 11-12 : Finalisation
   - Métriques et KPIs

5. **04-COMMUNICATION-PLAN.md** - Plan de communication équipe
   - Canaux de communication (Mattermost, fichiers, réunions)
   - Gestion des zones en modularisation
   - Modèles d'annonces concernant la modularisation
   - Matrice de décision pour développeurs
   - Procédure en cas de conflit

6. **05-TESTING-STRATEGY.md** - Stratégie de tests
   - Tests de contrat (nouveaux, critiques)
   - Tests E2E Playwright
   - Tests unitaires Vitest
   - Tests d'intégration
   - Workflow de tests pendant modularisation
   - Intégration CI/CD

### Fichiers vivants (mis à jour régulièrement)

7. **MODULARISATION_STATUT.md** - Suivi en temps réel de l'avancement
   - Progression globale
   - Modules migrés
   - Modules en cours
   - Zones en "feature freeze" du fait de leur modularisation en cours 🚧
   - Dates clés

8. **MODULARISATION_CARTOGRAPHIE.md** - Cartographie des modules
   - Liste de tous les modules avec métadonnées
   - Graphe de dépendances
   - Scoring et priorisation des modules
   - Estimation de charge

## 🚀 Par où commencer ?

### Si vous êtes le lead technique de la modularisation

1. Lire **00-OVERVIEW.md** pour la vue d'ensemble
2. Consulter **01-TECHNICAL-SETUP.md** pour préparer l'infrastructure
3. Étudier **02-MODULARISATION-STRATEGY.md** pour la méthodologie
4. Planifier avec **03-PLANNING.md**
5. Organiser la communication avec **04-COMMUNICATION-PLAN.md**
6. Mettre en place les tests avec **05-TESTING-STRATEGY.md**
7. Compléter **MODULARISATION_MAP.md** lors de la cartographie (S1-S2)
8. Maintenir **MODULARISATION_STATUT.md** à jour tout au long de la modularisation

### Si vous êtes développeur dans l'équipe

1. Lire **00-OVERVIEW.md** pour comprendre le projet
2. Consulter **MODULARISATION_STATUT.md** AVANT de traiter un ticket, pour éviter de toucher à une zone en cours de modularisation
3. Suivre le canal Mattermost #backend-modularisation qui sera créé dans cet objectif
4. Respecter les zones en modularisation (🚧)
5. Consulter **04-COMMUNICATION-PLAN.md** en cas de conflit

## 📊 Contexte du projet

- **Durée** : 3 mois (12 semaines)
- **Équipe** : 5 développeurs
- **Endpoints** : ~100
- **Approche** : Strangler Fig Pattern (modularisation progressive)
- **Stack cible** : NestJS + Prisma + Keycloak OIDC

## 🎯 Objectifs

- ✅ 100% des endpoints migrés sur NestJS
- ✅ 0 régression fonctionnelle
- ✅ Couverture tests E2E ≥ 50%
- ✅ Équipe autonome sur NestJS
- ✅ Documentation complète

## 📞 Contact

- **Lead technique** : @stephane.trebel
- **Canal Mattermost** : #backend-modularisation
- **Réunion hebdo** : Jeudi 10h (30min)

## 📚 Ressources externes

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)

---

**Bonne modularisation ! 🚀**

*Version 1.0 - Dernière mise à jour : 2026-01-07*
