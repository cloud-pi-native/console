---
name: cpn-triage
description:
  "Use when triaging issues or PRs in this repo, one item or the whole
  backlog: sweep untriaged items, assign every empty derivable field
  (type, labels, assignee, milestone, org fields), and requalify items
  whose evidence moved after triage."
license: Apache-2.0
metadata:
  version: '1.2.1'
---

# Triage console

Remplir chaque champ vide et déterminable des issues et PR ouvertes, ne rien
inventer, vérifier chaque écriture par relecture. La création d'issue est
`cpn-issue`, la création de PR `cpn-pr`, le boarding et le Status des
cartes `cpn-project`, les itérations PI `cpn-pi-transition`, le cycle de
vie `cpn-dev`. Ce skill couvre ce
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

Les scripts vivent dans ce skill : s'ils sont absents du dépôt courant, le
passage est bloqué — le signaler, jamais improviser une énumération
équivalente (compter à la main les items ouverts produit des baselines
fausses, sweep tronqué ou vide).


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

## Auditer d'abord la complétude du corps

Avant de dériver un champ du contenu, comparer le corps au formulaire que le
dépôt livre réellement (`.github/ISSUE_TEMPLATE/`). Le dépôt en livre
plusieurs : le formulaire de l'item est celui qui pose le label que porte
l'item **avant** le triage (`bug`, `question`, `user request`, `enhancement`,
`internal`) ; un label posé par le triage n'en désigne aucun. Sans label
antérieur, demander le formulaire plutôt que d'en choisir un. Une section
requise absente, vide ou encore en texte de remplissage est
un manque de complétude.
Publier un commentaire nommant les sections exactes, chacune d'après le
formulaire retenu (`gh issue comment
--body-file`), demander à l'auteur de les remplir — ne jamais réécrire le
corps pendant un triage, la rédaction revient à `cpn-issue`. Ne dériver
aucun champ d'une section manquante : les champs viennent du contenu
réellement présent et des autres preuves. Rapporter le manque dans le
résultat du triage. En requalification, un corps édité pour combler un
manque est une preuve déplacée : ne redériver que les champs dont la
dérivation a changé.

```bash
gh issue view <N> --repo cloud-pi-native/console --json body,labels
grep -l 'labels: \[<LABEL>\]' .github/ISSUE_TEMPLATE/*.yml # le formulaire retenu
cat .github/ISSUE_TEMPLATE/<FORM>.yml # ses sections requises
```

## Remplir (par item)

Tout champ **vide sur l'item** et **dérivable de son contexte**, rien
d'autre :

- **type** (issues seulement — l'API n'expose pas de type sur les PR) :
  défaut → `Bug`, capacité nouvelle → `Feature`, corvée ou suivi → `Task`.
- **labels** — correspondance de sens : défaut → `bug`, capacité →
  `enhancement`, doc → `docs`. Toujours `--add-label`, jamais `--label`.
- **assignee et milestone** — appliquer la procédure commune ci-dessous, sur les issues et PR.
- **Socle, PI et Epic** — obligatoires pour les issues et PR `cloud-pi-native` ;
  déléguer la vérification et le traitement des manques à `cpn-project`.
- **relations** (parent, sous-issues, bloqueurs) — seulement quand le corps
  ou les liens les énoncent, jamais déduits.
- **champs d'org** (issues seulement) — `Priority` : bloquant → `High`,
  routine → `Medium`, cosmétique repoussé → `Low` ; `Effort` : multi-fichiers
  ou risqué → `High`, borné → `Low` ; `Start date` seulement à la reprise
  effective, `Target date` seulement pour une échéance énoncée.
- **reviewers** (PR seulement) — appliquer la règle de l'équipe unique et
  les relectures de `cpn-pr` ; aucun reviewer de remplacement. Lire les
  demandes en cours avant toute modification de la PR.

Sur une PR : pas de type ni de champs d'org réservés aux issues. Les champs
socle du Projet s'appliquent aux deux types d'objets.

## Assignee et Milestone — création et triage

Appliquer systématiquement aux issues et PR `cloud-pi-native`, dès la création, sans attendre un triage ultérieur. Pour un objet existant, préserver les valeurs déjà posées sauf demande explicite de correction.

- **Assignee** : utiliser le compte demandé ; sinon, sur une PR, reprendre l'unique assignee du ticket lié s'il est assignable dans le dépôt cible. À défaut, assigner la personne qui demande le travail si son compte GitHub est identifié. Pour « moi », vérifier que le compte de `gh api user --jq .login` est bien celui de cette personne, pas un bot ni un compte partagé. En cas de doute ou de refus, demander le compte à utiliser. L'assignation ne change pas les demandes de revue.
- **Milestone** : lister les jalons ouverts du dépôt cible (`gh api --paginate 'repos/<OWNER>/<REPO>/milestones?state=open'`). Utiliser le titre explicitement demandé s'il est ouvert ; sinon choisir le jalon de livraison courant. Plusieurs jalons peuvent être ouverts : s'appuyer sur le calendrier de livraison confirmé, pas sur l'ordre de l'API ni sur la plus grande version. Sans calendrier explicite, retenir l'unique jalon de livraison ouvert, ou, s'ils sont tous datés, celui dont l'échéance à venir est la plus proche et unique. Si la cible reste ambiguë, demander confirmation. Ne pas déduire le jalon du PI, du type d'issue ou d'un numéro de version codé en dur.
- **Relecture** : `gh issue view` ou `gh pr view --json assignees,milestone` dans le dépôt cible. Vérifier le login attendu et `milestone.title`. Si une valeur manque ou si une écriture est refusée, donner l'URL de l'objet, le champ en cause et l'action restante ; ne pas annoncer une création complète. Avant toute modification d'une PR, relire ses demandes de revue conformément à `cpn-pr`.

## Écriture additive et vérification

```bash
gh issue edit N --repo cloud-pi-native/console --type Bug --add-label bug \
  --add-assignee "$ASSIGNEE" --milestone "$MILESTONE"
gh pr edit N --repo cloud-pi-native/console --add-label bug \
  --add-assignee "$ASSIGNEE" --milestone "$MILESTONE"
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
  `completed` ; doublon d'une issue existante → `duplicate` (lier
  l'issue canonique, jamais `not planned`) ; sinon `not planned` — même
  commentaire de piste, puis clôture. Sur demande explicite seulement :
  pendant un sweep, rapporter comme candidat à la clôture (`cpn-issue`),
  jamais auto-clôturé.
- **Les liens bougent aussi.** Le lien natif Déploiement issue↔PR est vérifié
  dès la création selon `cpn-pr`. En requalification, ne retirer un lien que
  si une preuve établit qu'il vise le mauvais ticket, pas parce que la PR a
  été fusionnée. Relire et commenter l'ancienne et la nouvelle relation.

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
  prouve rien — résoudre par la relation `projectItems` de l'issue/PR
  (mécanique : `cpn-project`).
- Bodies et payloads passent par fichiers (`--body-file`, `--input`), jamais
  en argument inline — l'expansion shell mutille les backticks et les `$`.
- Une classe `body` au scan — ou une section absente du formulaire — est un
  manque de complétude : l'auditer (section dédiée), commenter pour demander
  le remplissage, ne dériver aucun champ de l'absence. Rapporter le manque ;
  jamais réécrire le corps pendant un sweep.
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
