---
name: cpn-triage
description:
  "Use when triaging issues or PRs in this repo, one item or the whole
  backlog: sweep untriaged items, assign every empty derivable field
  (type, labels, assignee, milestone, org fields), and requalify items
  whose evidence moved after triage."
license: Apache-2.0
metadata:
  version: '1.0.0'
---

# Triage console

Remplir chaque champ vide et déterminable des issues et PR ouvertes, ne rien
inventer, vérifier chaque écriture par relecture. La création d'issue est
`cpn-issue`, la création de PR `cpn-pr`, les cartes du board Socle
`cpn-pi-transition`, le cycle de vie `cpn-dev-workflow`. Ce skill couvre ce
qu'ils ne couvrent pas : le remplissage et la requalification des
métadonnées, sur un item ou sur tout le dépôt.

## Prérequis

```bash
gh api user --jq .login # authentifié
gh api repos/cloud-pi-native/console --jq .permissions.push # true pour trier
```

Un prérequis manquant est un blocage signalé, jamais un contournement
silencieux.

## Périmètre

- `#N` → item. Classer en un appel :

```bash
gh api repos/cloud-pi-native/console/issues/N \
  --jq 'if has("pull_request") then "pr" else "issue" end'
```

- « trie le dépôt » → sweep : lister les items ouverts à métadonnées
  incomplètes, calculé contre ce que le dépôt supporte réellement :

```bash
bash .agents/skills/cpn-triage/scripts/scan-untriaged.sh cloud-pi-native/console
```

- **CAP** : 10 items par passage au maximum ; au-delà, traiter le CAP et
  rapporter le reste. Un sweep ne grandit jamais avec le backlog.

## Découvrir d'abord

`bash .agents/skills/cpn-triage/scripts/discover-metadata.sh
cloud-pi-native/console` fait foi : une classe absente de sa sortie reste
vide, aucune valeur inventée. Ne jamais poser une valeur qu'il ne liste pas.

État réel du dépôt (revérifier à chaque session, ne pas le supposer) :

- types d'issue activés : `Task`, `Bug`, `Feature` —
  `gh api repos/cloud-pi-native/console/issue-types` ;
- champs d'org lisibles : `Priority` (Urgent, High, Medium, Low), `Effort`
  (High, Medium, Low), `Start date`, `Target date` —
  `gh api orgs/cloud-pi-native/issue-fields` ;
- labels réels via `gh label list` : `bug`, `enhancement`, `docs`,
  `technical debt`, `a11y`, `ui/ux`, `CI/CD`, `security`, `refactor`…
  jamais de mémoire.

## Remplir (par item)

Tout champ **vide sur l'item** et **dérivable de son contexte**, rien
d'autre :

- **type** (issues seulement — l'API n'expose pas de type sur les PR) :
  défaut → `Bug`, capacité nouvelle → `Feature`, corvée ou suivi → `Task`.
- **labels** — correspondance de sens : défaut → `bug`, capacité →
  `enhancement`, doc → `docs`. Toujours `--add-label`, jamais `--label`.
- **assignee** — si vide : l'auteur de l'issue ; sinon
  `$(gh api user --jq .login)`.
- **milestone** — défaut → plus haut patch ouvert de la ligne mineure
  courante ; capacité → prochaine mineure ou majeure. Aucune milestone
  ouverte ne colle → laisser vide.
- **project** — ignorer sauf board évident ; l'ajout de carte au Socle est
  `cpn-pi-transition`.
- **relations** (parent, sous-issues, bloqueurs) — seulement quand le corps
  ou les liens les énoncent, jamais déduits.
- **champs d'org** (issues seulement) — `Priority` : bloquant → `High`,
  routine → `Medium`, cosmétique repoussé → `Low` ; `Effort` : multi-fichiers
  ou risqué → `High`, borné → `Low` ; `Start date` seulement à la reprise
  effective, `Target date` seulement pour une échéance énoncée.
- **reviewers** (PR seulement) — aucun demandé → le reviewer par défaut du
  dépôt, sauf s'il en est l'auteur (422) ; ignorer si aucun ne convient.

Sur une PR : pas de type, pas de champs d'org. Labels, assignee, reviewers
seulement.

## Écriture additive et vérification

```bash
gh issue edit N --repo cloud-pi-native/console --type Bug --add-label bug \
  --add-assignee "$ASSIGNEE" --milestone "9.29.0"
gh pr edit N --repo cloud-pi-native/console --add-label bug \
  --add-assignee "$ASSIGNEE" --add-reviewer "$REVIEWER"
```

Champs d'org : résoudre les ids de champs en direct, lire les valeurs
existantes, fusionner, écrire depuis un fichier — le `PUT` remplace **toutes**
les valeurs :

```bash
# 1. lire l'existant
gh api repos/cloud-pi-native/console/issues/N \
  --jq '.issue_field_values[] | {field_id: .issue_field_id,
    value: (.single_select_option.name // .value)}'
# 2. payload {"issue_field_values": [{"field_id": <id>, "value": "High"}]}
#    = valeurs existantes + nouvelles, jamais la seule nouvelle valeur
gh api -X PUT repos/cloud-pi-native/console/issues/N/issue-field-values \
  --input payload.json
```

Le read-back du `PUT` est un tableau nu : relire avec un `GET`. Chaque item
traité est relu ; chaque valeur posée doit réapparaître dans la relecture.
Une écriture rejetée est un échec rapporté, jamais un saut silencieux.

## Requalifier

Un item déjà trié reprend le triage quand sa **preuve a bougé** : corps édité
après triage, commentaires énonçant des faits postérieurs aux métadonnées,
diff d'une PR liée sortant de ses labels. Mêmes règles discover-first et de
correspondance de sens, sur la preuve courante ; ne changer que les champs
dont la dérivation a changé.

- **Jamais silencieux.** Chaque champ changé publie un commentaire de piste
  sur l'item : champ, ancien → nouveau, preuve qui l'a forcé.
- **L'état est un champ aussi.** Preuve de livraison par une PR liée →
  `completed` ; sinon `not planned` — même commentaire de piste, puis
  clôture. Sur demande explicite seulement : pendant un sweep, rapporter
  comme candidat à la clôture (`cpn-issue`), jamais auto-clôturé.
- **Les liens bougent aussi.** Le lien Development issue↔PR est une
  métadonnée : obsolète → retiré (`removeCloseIssueReferences`), manquant →
  ajouté (`addCloseIssueReferences`), commentaire de piste ancien → nouveau.

## Rapport

Table : item, type, champs posés (ou requalifiés, ancien → nouveau), preuve
de relecture ; comptages avant/après du sweep ; reste non traité au-delà du
CAP ; chaque échec avec sa raison. Ne rien fermer pendant un sweep — la
clôture est délibérée (`cpn-issue`).

## Pitfalls

- `--label` remplace tout le jeu de labels : `--add-label` seulement.
- Le `PUT` des champs d'org remplace tout : envoyer l'existant fusionné avec
  les nouvelles valeurs, pas les nouvelles seules. `single_select` prend le
  nom d'option exact (`High`), les dates le format ISO `YYYY-MM-DD` ; les ids
  de champs se résolvent en direct sur
  `orgs/cloud-pi-native/issue-fields`, jamais copiés d'une session à l'autre.
- Type sur une PR → échec d'écriture ; champs d'org sur une PR → ignorés.
  Ne pas tenter.
- Le scan émet une sentinelle `none` pour les colonnes vides : `read -r`
  décale les colonnes vides adjacentes, un item tout-vide sinon passe pour
  complet. Ne pas réécrire le parseur sans la sentinelle.
- `--paginate` obligatoire sur l'énumération : au-delà de 100 items, le reste
  disparaît silencieusement.
- `gh project item-list` tronque vers 1000 lignes : l'absence d'un item ne
  prouve rien — croiser avec le total du board (mécanique :
  `cpn-pi-transition`).
- Bodies et payloads passent par fichiers (`--body-file`, `--input`), jamais
  en argument inline — l'expansion shell mutille les backticks et les `$`.
- Un commentaire de piste manquant sur une requalification est le défaut que
  ce mode existe pour prévenir.
- Ne pas diagnostiquer, reworder ou fermer ici : `cpn-issue` (clôture),
  `cpn-pr` (corps de PR), `cpn-review` (revue).

## Vérification

```bash
gh api repos/cloud-pi-native/console/issues/N --jq '{type: (.type.name // "-"),
  labels: [.labels[].name], assignees: [.assignees[].login],
  fields: [.issue_field_values[] |
    "\(.issue_field_name)=\(.single_select_option.name // .value)"]}'
bash .agents/skills/cpn-triage/scripts/scan-untriaged.sh cloud-pi-native/console
# l'ensemble non trié a diminué
```
