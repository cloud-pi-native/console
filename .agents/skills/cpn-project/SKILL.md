---
name: cpn-project
description:
  "Use when boarding an issue or PR on the Socle project or setting its
  Status to the real phase: runtime resolution of the board and field ids,
  onboarding, transitions, drift audit."
license: Apache-2.0
metadata:
  version: '1.1.0'
---

# Cartes et statut sur le Projet Socle

Possède le boarding des issues et PR sur le Projet Socle et leur champ
**Status** : la phase réelle du travail, avancée une fois par transition,
remise en cause sur marche arrière, jamais devinée depuis une sortie
périmée — relire l'item avant d'agir. Les itérations PI et la cohérence
PI↔milestone sont `cpn-pi-transition` ; les autres métadonnées (type,
labels, assignee, milestone) sont `cpn-triage`.

## Prérequis

- `gh` authentifié ; `read:project` requis pour l'audit, `project` avant
  toute écriture — si absent, s'arrêter sans mutation et indiquer :

```bash
gh auth refresh -s read:project
gh auth refresh -s project
```

- Numéro du Projet confirmé pour la session (mécanique de confirmation :
  `cpn-pi-transition`).

Un prérequis manquant est un blocage signalé, jamais un contournement
silencieux.

## À la création d'une issue ou d'une PR

Pour tout dépôt `cloud-pi-native`, l'ajout au Projet `Socle` est obligatoire. Depuis `cpn-issue` ou `cpn-pr`, exécuter ce parcours sans attendre un triage ultérieur :

1. Résoudre le Projet dans `gh project list --owner cloud-pi-native` (titre exact, résultat unique) et les champs/options réels avec `gh project field-list`. Pour les dates et ids d'itérations, lire en GraphQL `ProjectV2IterationField.configuration.iterations` (champ `PI`, jamais `PI-Backlog`).
2. Retenir l'itération explicitement demandée, sinon l'unique itération dont l'intervalle `[startDate, startDate + duration)` contient la date courante. Si aucune ne correspond ou si le choix n'est pas unique, signaler le blocage ; ne pas choisir l'itération la plus proche.
3. Déduire l'`Epic` du contenu du ticket, parmi les options du Projet ; pour une PR, utiliser l'Epic vérifié du ticket associé ou appliquer la même règle à son contenu. Si plusieurs options restent plausibles, demander confirmation ; ne pas deviner.
4. Résoudre puis ajouter la carte si absente, en utilisant l'URL complète de l'objet créé. Poser `PI` avec `gh project item-edit --iteration-id` et `Epic` avec `--single-select-option-id` (ids de projet, carte et champ résolus à l'exécution). Pour une issue non triée, poser la colonne de backlog, sans la déclarer `Ready`.
5. Relire `projectItems` et les valeurs `PI`, `Epic` et `Status` sur la carte Socle. Si une étape est bloquée, fournir l'URL déjà créée, les champs vérifiés et l'action restante. Ne pas présenter la création comme conforme et ne pas recréer l'objet.

Ce parcours concerne l'initialisation d'un objet créé, pas les migrations de PI ni les corrections en lot. En triage, signaler les écarts et ne corriger que les valeurs vides et déterminables ; préserver les valeurs explicitement choisies et les gates d'approbation des lots.

## Carte des phases

Les noms de colonnes diffèrent par board ; les phases sont les mêmes.
Avancer sur le signal, remonter sur marche arrière :

| Carte  | Phase  | Signal qui déclenche le mouvement                          |
| ------ | ------ | ----------------------------------------------------------- |
| Issue  | Backlog | issue créée, triage non terminé |
| Issue  | Ready  | triage complet (`cpn-triage`)                               |
| Issue  | Active | worktree d'isolation créé pour sa correction (`cpn-delegate`) |
| Issue  | Done   | issue fermée délibérément, ledger N sur N                   |
| PR     | Active | PR ouverte depuis la worktree d'isolation                   |
| PR     | Review | PR sortie du brouillon et revue demandée                    |
| PR     | Done   | PR fusionnée (rebase via la merge queue sur `main`)         |
| Toute  | Parked | rationale explicite requise                                 |

Le signal `Review` part une fois, quand la PR n'est plus en brouillon et que la revue est demandée — pas à chaque push de branche. La carte d'une PR fusionnée ne retourne pas en backlog quand
l'issue qui l'a enfantée reste ouverte pour du follow-up : cette issue a sa
propre carte.

## Découverte du vocabulaire (par board, à chaque usage)

L'id du champ Status et les ids des options sont **par board** — jamais
codés en dur. Résoudre avant chaque édition :

```bash
gh project field-list <NUMÉRO> --owner cloud-pi-native --format json \
  --jq '.fields[] | select(.name == "Status")'
```

Lire `.id` et `options[].id`/`options[].name` ; la carte des phases dit
quelle option le mouvement suivant vise.

## Procédure

### 1. Résoudre l'item

Le Projet Socle couvre plusieurs dépôts — un numéro seul est ambigu, et la
pagination ne garantit rien sur un board de plusieurs milliers d'items.
Résoudre la carte depuis l'issue/PR elle-même, jamais par scan du board :

```bash
gh api graphql -f query='
  query($owner:String!,$repo:String!,$num:Int!){
    repository(owner:$owner,name:$repo){
      issueOrPullRequest(number:$num){
        ... on Issue       { projectItems(first:100){nodes{id project{number title}}}}
        ... on PullRequest { projectItems(first:100){nodes{id project{number title}}}}
      }
    }
  }' -f owner=cloud-pi-native -f repo=<DÉPÔT> -F num=<N>
```

Filtrer sur `project.number` du Projet Socle, exiger **exactement une**
correspondance — le même numéro existe dans plusieurs dépôts, un scan
`item-list --jq '.items[] | select(.content.number == <N>)'` peut rendre la
carte d'un autre dépôt, et un board tronqué la fait passer pour absente.

Absent du résultat = carte non boardée → étape 2.

### 2. Boarder si absent

```bash
gh project item-add <NUMÉRO> --owner cloud-pi-native \
  --url https://github.com/cloud-pi-native/console/issues/<N>
# PR : même commande avec l'URL de la PR ; content.type les distingue
```

Le triage (`cpn-triage`) est le gate pour passer l'issue à `Ready`, pas pour l'ajouter au projet. Une carte ajoutée atterrit sans Status : le poser immédiatement (étape 3).

### 3. Poser Status sur la phase réelle

```bash
gh project item-edit --id <ITEM_ID> --project-id <PROJECT_NODE_ID> \
  --field-id <STATUS_FIELD_ID> --single-select-option-id <OPTION_ID>
```

Les ids viennent de la découverte de vocabulaire. Lire la phase depuis
l'état réel — ledger de l'issue, revues, état de merge — jamais depuis la
dernière commande lancée : `gh pr view <N> --json state,mergedAt` décide
`Done`.

### 4. Relire

Par l'id d'item résolu à l'étape 1 — un `fieldValueByName` à `null` = statut
non posé :

```bash
gh api graphql -f query='
  query($id:ID!){
    node(id:$id){
      ... on ProjectV2Item {
        fieldValueByName(name:"Status"){
          ... on ProjectV2ItemFieldSingleSelectValue { name }
        }
      }
    }
  }' -f id=<ITEM_ID>
```

Le statut imprimé égale la colonne visée, sinon le mouvement n'a pas eu
lieu.

## Gate des mutations en lot

Un lot d'écritures Projects V2 est gated, pas tiré. Avant toute édition en
série : table complète — item, champ, valeur actuelle, valeur cible — et
approbation explicite de cette table. « Déplace-les tous » ou « corrige les
anomalies » ne vaut pas approbation ; une correction d'item fermé figure
individuellement dans la table validée. Écrire uniquement les champs
approuvés, relire chaque cible (étape 4), rapporter la dérive résiduelle.
Une erreur API mid-lot arrête la phase : rapporter les mutations confirmées,
ré-obtenir l'approbation pour le reste — jamais rejouer le lot aveuglément.
Une écriture en timeout peut avoir été commitée côté serveur : relire
l'item avant de la re-proposer.

## Pitfalls

- `gh project list --org` n'existe pas — le Projet Socle appartient à
  l'org `cloud-pi-native` : passer `--owner cloud-pi-native`.
- **Les ids d'items sont scopés par projet.** Jamais réutiliser un id
  résolu sur un autre board.
- **Ids de champs/options ≠ noms, et par board.** Les résoudre en direct ;
  un codage en dur pourrit au premier renommage de colonne.
- `item-delete` en script exige le numéro de projet positionnel plus
  `--owner` — manquer l'un des deux et il refuse.
- **Sortie périmée ment après merge.** Les lignes de succès de merge ne
  prouvent rien ; passer à `Done` seulement après relecture de
  `gh pr view <N> --json state,mergedAt`.
- Une carte sur un autre board que celui de son contexte est mal classée :
  re-résoudre, puis `item-delete` + re-add.

## Vérification

```bash
gh api graphql -f query='
  query($id:ID!){
    node(id:$id){
      ... on ProjectV2Item {
        fieldValueByName(name:"Status"){
          ... on ProjectV2ItemFieldSingleSelectValue { name }
        }
      }
    }
  }' -f id=<ITEM_ID>
```
