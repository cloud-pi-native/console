---
name: cpn-pi-transition
description: Use when auditing or moving GitHub Project issues between Product Increment iterations, reconciling PI and release milestones, or preparing an end-of-PI release-management review in cloud-pi-native/console.
---

# Transition de PI

Ce skill gère les métadonnées GitHub du Projet Socle. `RELEASE.md` reste l’autorité pour les branches, tags, releases, images et charts ; un skill distinct traitera la communication externe.

## Règle fondamentale

**Audit d’abord, écriture après approbation explicite, vérification fraîche ensuite.** L’urgence ne justifie ni une bascule sans liste ni une correction implicite.

## Prévol

Demander ou confirmer : dépôt, numéro du Projet, champ d’itération (par défaut `PI`, jamais `PI-Backlog`), itérations source/cible, règle des issues ouvertes, règle de cohérence PI/milestone des issues fermées, et périmètre des issues fermées sans PI.

Ne déduire aucune version du nom d’un PI. Une règle telle que `PI17 5` → `9.26.0` doit être fournie ou confirmée.

```bash
gh auth status
gh project field-list <PROJECT_NUMBER> --owner cloud-pi-native --format json
gh project item-list <PROJECT_NUMBER> --owner cloud-pi-native --limit 1000 --format json
gh issue list --repo cloud-pi-native/console --state all --limit 1000 --json number,state,milestone,title
```

`read:project` est requis pour l’audit ; `project` est requis avant toute écriture. Si absent, s’arrêter sans mutation et indiquer :

```bash
gh auth refresh -s read:project
gh auth refresh -s project
```

## Audit

Ne retenir que les items de type `Issue` : exclure Pull Requests et brouillons. Croiser le statut GitHub (`OPEN`/`CLOSED`) avec le statut Projet : `Done` ne ferme pas une issue GitHub.

Présenter séparément :

| Groupe | Informations minimales |
| --- | --- |
| Issues ouvertes de l’itération source | numéro, titre, statut Projet, assignees, PI, milestone, action proposée |
| Issues fermées du périmètre | numéro, PI, milestone, statut Projet, écart constaté |

Signaler sans corriger : issue ouverte `Done`, issue fermée sans PI, sans milestone, avec milestone incohérent ou statut Projet non terminal. Une issue absente du Projet est non-auditable pour `PI` ; ne pas l’ajouter automatiquement.

## Approbation obligatoire

Avant une mutation, fournir la table complète des changements : **issue, champ, valeur actuelle, valeur cible**. Attendre une réponse qui approuve explicitement cette table.

Une demande comme « bascule-les », « corrige les anomalies » ou « ne me montre pas de liste » ne vaut pas approbation. Une correction d’issue fermée doit figurer individuellement dans la table validée.

## Écriture limitée

Après approbation seulement, modifier exclusivement les champs validés :

```bash
gh project item-edit --id <ITEM_ID> --project-id <PROJECT_ID> \
  --field-id <PI_FIELD_ID> --iteration-id <ITERATION_ID>
gh issue edit <ISSUE_NUMBER> --repo cloud-pi-native/console \
  --milestone <MILESTONE>
```

L’itération et le milestone sont deux opérations distinctes. Conserver un milestone existant, sauf changement explicitement approuvé. Ne jamais fermer/réouvrir une issue, modifier labels, assignees, statut Projet ou appartenance au Projet sans instruction distincte.

En cas de scope insuffisant, erreur ou limite d’API : arrêter la phase, relire les seuls items ciblés, rapporter les mutations confirmées et attendre une nouvelle approbation avant de reprendre. Ne jamais rejouer aveuglément toutes les écritures.

## Vérification

Après écriture, relire chaque issue et item ciblé — de préférence par requête GraphQL ciblée plutôt qu’en relistant tout le Projet — et vérifier : état GitHub, itération attendue et milestone attendu ou préservé. Rapporter les écarts résiduels, notamment les anomalies d’issues fermées non approuvées.
