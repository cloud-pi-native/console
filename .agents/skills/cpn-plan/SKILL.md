---
name: cpn-plan
description:
  "Use when planning a milestone from a goal: converge the direction,
  decompose into dependency-ordered units, fill the milestone with triaged,
  boarded issues ready for the work loop."
license: Apache-2.0
metadata:
  version: '1.0.0'
---

# Planification de milestone

Stratégie au-dessus de la boucle d'exécution : transformer un but en
milestone rempli — issues triées, boardées, dépendances posées — prêt pour
`cpn-iterate`. La création d'issue est `cpn-issue`, le remplissage des
champs `cpn-triage`, les cartes et le champ Status `cpn-project`, le cycle
d'exécution `cpn-dev` ; ce skill possède la décomposition, l'ordre et le
remplissage du milestone, pas leur mécanique.

## Prérequis

- But convergé : la discussion est close (`cpn-discussion`) ou le but est
  énoncé par l'utilisateur comme un fait.
- `gh` authentifié avec accès en écriture, vérifié :

```bash
gh api user --jq .login # authentifié
gh api repos/cloud-pi-native/console --jq .viewerPermission # write
```

Un prérequis manquant est un blocage signalé, jamais un contournement
silencieux.

## Procédure

### 1. Converger le but

Direction non convergée → `cpn-discussion` d'abord ; des unités coupées
avant la convergence sont à recouper. Convergé = RFC close ou but énoncé
comme un fait.

### 2. Décomposer en unités

Une unité = une issue : complète en une passe `cpn-dev`. Pour chaque unité,
nommer ses dépendances et marquer les indépendantes — elles forment les
groupes de fan-out que la boucle routera ensemble. Couper le superflu :
toute unité non requise pour atteindre le but sort du lot ; elle sera
replanifiée quand elle deviendra réelle.

### 3. Présenter la table et attendre

Table : unité, dépend de, groupe de fan-out. Ouvrir les issues est un lot
gated : aucune écriture avant approbation explicite de la table.

### 4. Remplir le milestone

Milestone nommé par l'utilisateur → l'utiliser. Sinon en créer un selon la
convention du dépôt — capacité → prochaine mineure ou majeure ; un défaut
prend le plus haut patch ouvert de la ligne mineure courante :

```bash
# payload.json : {"title": "<version>", "state": "open",
#                 "description": "<but en une ligne>"} — pas de due_on
gh api repos/cloud-pi-native/console/milestones --input payload.json
gh api repos/cloud-pi-native/console/milestones --jq '.[].title' # relecture
```

Pas de `due_on` sans échéance réelle énoncée : une date est un engagement,
jamais inventée pour remplir un champ.

### 5. Ouvrir et trier chaque issue

Création par `cpn-issue` (template français, ledger d'acceptation
command-décidable) puis champs par `cpn-triage`. Les dépendances sont
posées sur les issues (relations), pas seulement dans la prose du plan. Le
triage ne pose pas de milestone : chaque unité est assignée au milestone
ici (ou à l'étape 4 quand l'issue existe déjà).

### 6. Boarder le lot

Chaque carte Status `Ready` sur le board (`cpn-project`) — le board est ce
que `cpn-iterate` lit ; pas de board, pas de boucle.

### 7. Clore la boucle de planification

Rapport final : milestone, unités, dépendances, carte par carte — la main
passe à `cpn-iterate`.

## Pitfalls

- **Restater les enfants.** Forme d'issue, champs de triage, cartes et
  boucle appartiennent à leurs skills ; un wrapper qui les ré-enseigne
  dérive le jour où un enfant change.
- **Ledger semé trop mince.** Une issue qui atterrit sans éléments
  command-décidables reporte sa convergence dans la boucle — l'endroit le
  plus coûteux pour la trancher.
- **Ordre de dépendance perdu.** Un ordre énoncé seulement dans le rapport
  de plan disparaît à la session suivante ; le triage l'écrit sur les
  issues.
- **Planifier un but non convergé.** Le gate RFC coûte moins cher que
  recouper le lot d'unités après un changement de direction.
- **Inventer une échéance.** Le milestone porte une date seulement si une
  échéance réelle existe ; un champ vide est honnête.

## Vérification

```bash
gh api repos/cloud-pi-native/console/milestones --jq '.[].title'
gh issue list -R cloud-pi-native/console --json number,milestone \
  --jq '.[] | select(.milestone.title == "<version>") | .number'
# plus le read-back de cpn-project : chaque carte boardée, Status Ready
```

Fini quand chaque unité approuvée est une issue ouverte et triée sur le
milestone, boardée `Ready`, dépendances posées sur les issues, et que le
rapport nomme la passe à `cpn-iterate`.
