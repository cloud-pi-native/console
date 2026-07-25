# Contribuer à Console Cloud Pi Native

Merci de contribuer à la Console Cloud Pi Native. Ce guide s'applique aux
contributions internes et externes, qu'elles concernent du code, de la
configuration, des dépendances ou de la documentation.

## Principes

La Console fournit une interface unifiée pour piloter les services de l'offre
Cloud Pi Native, automatiser le cycle de vie des projets et appliquer les
exigences DevSecOps de sécurité, de qualité, de maintenabilité et
d'interopérabilité.

Toute évolution doit démontrer son alignement avec cette vision avant toute
implémentation. Une contribution qui ne sert pas l'offre, son architecture ou
sa feuille de route ne peut pas être acceptée.

## Qualifier le sujet avant de développer

Toute contribution de code doit être adossée à un ticket. Ce ticket décrit :

- le besoin traité et son alignement avec la vision produit ou la feuille de route ;
- le périmètre fonctionnel et technique de la contribution ;
- les critères d'acceptation ;
- les impacts connus sur la sécurité, les contrats API, les données, l'exploitation et la documentation.

Pour une correction de bug, une procédure de reproduction, un test automatisé
de non-régression et, pour une interface, des captures d'écran sont fortement
recommandés lorsqu'ils sont pertinents. Leur absence ne bloque pas la
contribution lorsqu'ils ne peuvent pas s'appliquer. Pour une fonctionnalité,
joindre des maquettes ou croquis, même rudimentaires, est encouragé.

Les corrections strictement documentaires ou typographiques, sans impact
fonctionnel, sont les seules contributions qui ne nécessitent pas de ticket.
Elles restent soumises au contrôle de périmètre et aux exigences de qualité
adaptées.

## Respecter le périmètre

Une pull request ou merge request ne contient que les changements nécessaires
au sujet décrit par son ticket. Les commits, fichiers ou changements sans
rapport direct avec ce sujet sont rejetés et doivent être proposés séparément,
avec leur propre ticket.

Utilisez le [template de pull request](.github/PULL_REQUEST_TEMPLATE.md) pour
présenter le comportement modifié et les informations utiles à la revue. Son
évolution est traitée séparément de ce guide.

## Obtenir les validations requises

Une approbation explicite de l'équipe Socle est obligatoire pour toute
contribution de code qui n'est ni une correction de bug ni un changement
trivial.

L'approbation explicite de l'équipe Socle est obligatoire dans tous les cas
pour :

- l'ajout, la suppression ou la mise à niveau d'une dépendance Node.js ;
- l'ajout ou la mise à niveau d'un outil installé dans une image Docker ;
- tout autre changement de dépendance ayant un impact sur la chaîne d'approvisionnement, la sécurité ou la maintenance.

Les corrections de bugs et les changements triviaux ne dispensent ni du
contrôle de périmètre, ni de la revue de code, ni des contrôles qualité. Une
dépendance ajoutée pour corriger un bug doit donc recevoir l'approbation
explicite de l'équipe Socle.

## Cibler le backend approuvé

`apps/server` est le backend historique et ne reçoit plus de contribution.
Toute pull request ou merge request qui modifie ce dossier est rejetée, y
compris pour une correction de bug.

Les évolutions backend ciblent exclusivement `apps/server-nestjs`. Elles
suivent le [plan de modularisation backend vers NestJS](apps/server-nestjs/documentation/Modularisation-de-console-server/README.md), l'[état de migration](apps/server-nestjs/documentation/Modularisation-de-console-server/MODULARISATION-STATUT.md), les conventions NestJS et la stratégie de tests associée. Toute dérogation est une décision explicite de l'équipe Socle, hors du flux normal de contribution.

## Respecter l'architecture et la qualité

Respectez les frontières et conventions de la zone modifiée :

- le frontend Vue 3 et le système de design existant ;
- les modules NestJS et Prisma dans `apps/server-nestjs` pour le backend ;
- les contrats partagés, permissions et schémas de données ;
- les plugins et leurs mécanismes de cycle de vie lorsqu'ils sont concernés.

Ajoutez ou adaptez les tests proportionnés au risque et au périmètre : tests
unitaires ou d'intégration pour la logique et les contrats, et tests Playwright
pour les parcours utilisateurs affectés. Mettez à jour la documentation lorsqu'un
comportement, une API, une configuration, une opération ou une migration est
affectée.

Avant soumission, exécutez les contrôles adaptés à votre modification :

```bash
pnpm lint
pnpm test
pnpm playwright:test
```

Le test Playwright est requis lorsque la contribution affecte un parcours
utilisateur. Respectez aussi TypeScript strict, ESLint, Stylelint pour le
client, les hooks Husky et la CI. Les messages de commit suivent Conventional
Commits et sont rédigés en anglais. Rebasez votre branche sur `origin/main`
avant la demande de fusion.

## Documents de référence

Consultez et citez les références appropriées dans le ticket :

- la [documentation publique Cloud Pi Native](https://github.com/cloud-pi-native/documentation), notamment l'[introduction de la plateforme](https://github.com/cloud-pi-native/documentation/blob/main/docs/platform/introduction.md) et la [feuille de route](https://github.com/cloud-pi-native/documentation/blob/main/docs/platform/roadmap.md) ;
- l'[architecture et les conventions du dépôt](README.md) ;
- le [plan de modularisation NestJS](apps/server-nestjs/documentation/Modularisation-de-console-server/README.md) ;

La feuille de route publique est actuellement en cours de rédaction. Son
indisponibilité ne bloque pas la qualification : le ticket doit alors exposer
une justification concise au regard de la vision produit.
