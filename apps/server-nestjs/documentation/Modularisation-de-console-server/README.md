# Documentation de Modularisation du Backend de Console (apps/server) vers NestJS

Ce dossier contient toute la documentation nécessaire pour mener à bien la
modularisation du backend Node.js vers NestJS.

## 📁 Structure de la documentation

### Documents principaux

1. **00-OVERVIEW.md** - Vue d'ensemble du projet de modularisation
   - Objectifs et contexte
   - Stratégie "Strangler Fig Pattern"
   - Principes directeurs
   - Métriques de succès

2. **01-MODULARISATION-STRATEGIE.md** - Stratégie et méthodologie
   - Modularisation par slices verticales
   - Cartographie et priorisation
   - Gestion singletons → Injection de dépendances
   - Méthodologie en 7 étapes par module

3. **02-ARCHITECTURE-MODULES.md** - Pattern d'un module NestJS
   - Structure type `src/modules/<module>/`
   - Sens des dépendances (client / service / datastore / utils)
   - Tests Vitest

4. **../mise-en-place-nginx-etrangleur/PLAN.md** - Plan nginx-strangler
   - Configuration du reverse proxy progressif
   - Routage "as-code" (`apps/nginx-strangler/conf.d/routing.conf`)
   - Déploiement docker compose et rollback

### Fichiers vivants (mis à jour régulièrement)

5. **MODULARISATION-STATUT.md** - Suivi en temps réel de l'avancement
   - Progression globale
   - Modules exposés (déclarés dans `main.module.ts`)
   - Modules de plugins encapsulés mais non routés
   - Zones en "feature freeze"
   - Dates clés

6. **MODULARISATION-CARTOGRAPHIE.md** - Cartographie des modules
   - Liste de tous les modules avec métadonnées et statut
   - Graphe de dépendances (Mermaid)
   - Scoring et priorisation
   - Estimation de charge par vague

## 🚀 Par où commencer ?

### Si vous êtes le lead technique de la modularisation

1. Lire **00-OVERVIEW.md** pour la vue d'ensemble
2. Consulter **01-MODULARISATION-STRATEGIE.md** pour la méthodologie
3. Étudier **02-ARCHITECTURE-MODULES.md** pour le pattern des modules
4. Lire **../mise-en-place-nginx-etrangleur/PLAN.md** pour le routage
5. Maintenir **MODULARISATION-STATUT.md** et **MODULARISATION-CARTOGRAPHIE.md**
   à jour tout au long de la modularisation

### Si vous êtes développeur dans l'équipe

1. Lire **00-OVERVIEW.md** pour comprendre le projet
2. Consulter **MODULARISATION-STATUT.md** AVANT de traiter un ticket, pour
   éviter de toucher à une zone en cours de modularisation
3. Suivre le canal Mattermost #backend-modularisation
4. Respecter les zones en modularisation (🚧)

## 📊 Contexte du projet

- **Durée prévue** : 3 mois (12 semaines)
- **Équipe** : 5 développeurs
- **Endpoints** : ~100 (legacy), ~75 routes métier ciblées
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

*Version 1.1 - Dernière mise à jour : 2026-07-15 (réconciliation avec l'état du code)*
