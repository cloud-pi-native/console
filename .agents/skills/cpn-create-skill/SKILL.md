---
name: cpn-create-skill
description: Use when creating, changing, evaluating, or standardizing a skill in cloud-pi-native/console, especially when its scope, Agent Skills structure, triggering, or comparative evidence must be defined.
license: Apache-2.0
metadata:
  version: '1.0.0'
---

# Créer un skill CPN

Créer un skill est un travail de conception et de preuve, pas seulement de rédaction. Un skill n’est prêt que lorsque son besoin est atomique, son format est conforme et son effet est comparé à une référence.

## Frontière

Ce skill traite uniquement la création, modification et évaluation d’un skill. Il ne gère pas les tickets, branches, worktrees, commits, PR ou revues : déléguer ces sujets au skill CPN correspondant. Face à un besoin qui les mélange, citer les délégations pertinentes, par exemple `cpn-issue`, `cpn-delegate` et `cpn-pr`, sans en recopier les procédures. Pour une demande qui cite issues, worktrees et PR, écrire explicitement : « déléguer les issues à `cpn-issue`, les worktrees à `cpn-delegate` et les PR à `cpn-pr` ».

Au cadrage, vérifier qu’une capacité cohérente est demandée. Si plusieurs responsabilités indépendantes apparaissent, expliquer la frontière et demander si l’utilisateur veut un skill complémentaire. Ne jamais imposer la scission ni créer ce second skill dans la même démarche.

## Première réponse

Avant de poser une question, annoncer qu’aucune rédaction ne commence sans conception approuvée. Indiquer que le skill cible suivra le profil Agent Skills CPN sans reprendre le workflow Git, et que sa livraison exige au moins trois scénarios réalistes, une référence sans skill et une exécution avec le skill dans des contextes isolés. Poser ensuite une seule question de cadrage. Si la sortie attendue est absente, la demander avant les sources, dépendances ou cas limites.

## Parcours

1. Recueillir, une question à la fois, l’objectif, les déclencheurs, les entrées, la sortie, les dépendances, les cas limites et les critères de succès. Annoncer dès ce cadrage que la livraison exige au moins trois scénarios réalistes, une référence sans skill et une exécution avec le skill dans des contextes isolés.
2. Lire les skills voisins et les sources d’autorité. Lire [le profil Agent Skills CPN](references/agentskills-cpn.md) avant de définir la structure.
3. Proposer les options et leurs compromis, recommander une conception, puis attendre son approbation explicite avant de rédiger ou modifier le skill.
4. Rédiger le skill et ses ressources selon le profil. Expliquer la raison des règles ; ne pas recopier les règles d’un autre skill CPN.
5. Lire [le protocole d’évaluation](references/evaluation-protocol.md), exécuter et conserver la comparaison obligatoire sans/avec skill, puis corriger les écarts et réexécuter les scénarios concernés.
6. Vérifier la structure et rapporter les preuves. Une source indisponible, un besoin non cadré, une approbation absente ou une comparaison impossible bloque la phase : le signaler, sans inventer de résultat.

## Sortie attendue

Rapporter le périmètre retenu, les limites signalées, les sources consultées, la conception approuvée, les fichiers créés, les scénarios et résultats comparatifs, les corrections effectuées et les contrôles structurels. Déléguer explicitement toute action corrélaire au skill CPN approprié.
