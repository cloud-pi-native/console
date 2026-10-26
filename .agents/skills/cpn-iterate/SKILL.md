---
name: cpn-iterate
description:
  "Use when running a board-driven work loop across cards: pull the next
  card, run the unit lifecycle, stop on empty active column, BLOCKED
  parking, or exhausted budget."
license: Apache-2.0
metadata:
  version: '1.0.0'
---

# Boucle d'itération

Boucle pilotée par le board : lire le board (`cpn-project`), tirer la carte
suivante, la passer par le cycle d'exécution, clore l'itération par un bloc
de statut, recommencer. Ce skill possède la boucle, ses conditions d'arrêt
et le routage — le cycle d'une unité est `cpn-dev`, l'isolation
`cpn-delegate`, le board `cpn-project` ; aucun n'est restaté ici.

Gate d'entrée : `cpn-plan` a tourné à terme — la boucle consomme un
milestone planifié et boardé. Board vide ou backlog non planifié → retour à
`cpn-plan`, jamais de tirage improvisé.

## Prérequis

```bash
gh api user --jq .login # authentifié
gh api repos/cloud-pi-native/console --jq .viewerPermission # write
```

Un prérequis manquant est un blocage signalé, jamais un contournement
silencieux.

## La boucle

1. **Tirer.** Lire le board (`cpn-project`). Prendre la carte suivante dans
   la colonne active la plus à droite — le board est le plan tactique ; ce
   skill ne choisit pas le travail autrement.
2. **Router.** Un défaut passe d'abord par l'analyse cause-racine en
   commentaires d'issue : la proposition tranche le ledger avant toute
   correction. Ensuite chaque carte suit l'échelle : une carte →
   `cpn-delegate` ; cartes indépendantes → une worktree chacune, en
   parallèle.
3. **Exécuter.** L'unité elle-même est le cycle `cpn-dev`, de bout en bout
   — ce skill ne le re-dérive pas.
4. **Clore l'itération.** Un bloc de statut par itération : carte prise,
   résultat de l'unité, preuves (PR, issue). Une carte bloquée est garée
   avec sa rationale sur la carte (`cpn-project`), pas dans la prose.
5. **Arrêter ou recommencer.** Une condition d'arrêt (ci-dessous) finit la
   boucle ; sinon, retirer.

## Conditions d'arrêt

Exactement trois — une seule suffit :

- **Colonne active la plus à droite vide.** Le board ne contient plus de
  carte actionnable.
- **Carte bloquée garée avec rationale.** La carte suivante est bloquée ;
  la garer avec le bloqueur sur la carte et s'arrêter.
- **Budget d'itération épuisé.** Le nombre de cartes (ou budget de temps)
  fixé par l'utilisateur est dépensé ; rapporter où en est la boucle.

## Fin de milestone

Quand la boucle vide le board d'un milestone de release : le rapport le
signale ; la clôture du milestone et la coupe de release suivent la
procédure du dépôt (`RELEASE.md`, notes par `cpn-release-notes`). La boucle
ne coupe pas de release elle-même.

## Pitfalls

- **Ne pas re-dériver le cycle.** La mécanique vit dans `cpn-dev` ; la
  restater ici est le défaut de wrapper que le fold précédent rejette.
- **Une carte bloquée est garée, jamais passée sous silence.** Sauter perd
  le bloqueur ; garer l'enregistre là où la session suivante le retrouve.
- **Un bloc de statut par itération, pas par phase** — le bavardage
  mid-boucle est du bruit ; le bloc clôt l'itération.

## Vérification

```bash
# par itération : la carte a bougé et les preuves existent
gh issue view <N> -R cloud-pi-native/console --json state -q .state
gh pr view <PR> -R cloud-pi-native/console --json state,url \
  -q '"\(.state) \(.url)"'
```

Fini quand chaque carte tirée est livrée, garée bloquée avec rationale, ou
que le budget expire avec le rapport disant lequel des trois.
