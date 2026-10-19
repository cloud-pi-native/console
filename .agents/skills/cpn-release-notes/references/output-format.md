# Format de sortie des Release Notes

## Source — `CHANGELOGS/<version-stable>.md`

```markdown
---
consoleVersion: <version stable>
candidateTag: <tag RC ou stable>
appVersion: <appVersion Helm confirmée>
chartVersion: <version chart Helm confirmée>
milestone: <URL du milestone>
status: draft | published
---

# dso-console <version stable>

## ⚠️ Actions requises pour la mise à jour

- **Qui et dans quel cas :** <public et condition précise>.
  **Quand :** <avant/après la mise à jour ou avant une opération nommée>.
  **À faire :** <étapes concrètes et ordonnées>.
  **Sans cette intervention :** <conséquence vérifiée>.
  [Procédure](<URL de la documentation pertinente>) · [Ticket](<URL>)

## Objectif(s) de cette version

<résumé court de l'effet de la version pour ses lecteurs>

## Changements livrés

### Pour les équipes projet

- **<titre concret>** — <situation concernée, changement et effet observable>.
  [Documentation](<URL pertinente, section si utile>) · [Ticket](<URL>)

### Pour l'administration du socle

- **<titre concret>** — <situation concernée, changement et effet observable>.
  [Documentation](<URL pertinente, section si utile>) · [Ticket](<URL>)

### Pour l'exploitation du socle

- **<titre concret>** — <situation concernée, changement et effet observable>.
  [Documentation](<URL pertinente, section si utile>) · [Ticket ou PR](<URL>)

## Autres changements

- <changement secondaire utile, expliqué avec ses liens documentaire et technique>
```

### Rubriques conditionnelles

- N'inclure que les publics et rubriques ayant du contenu. Ne pas remplir une rubrique par « Aucun ».
- Inclure **⚠️ Actions requises pour la mise à jour** uniquement si une intervention est nécessaire. La placer immédiatement après le titre, avant les objectifs et les changements. Conserver public, conditions, étapes, échéance, risque et lien documentaire dans tous les rendus.
- Sans intervention nécessaire, supprimer entièrement cette rubrique, sans phrase « aucune action nécessaire » ailleurs dans la note.
- Si une intervention est possible mais mal définie, utiliser **⚠️ Actions à clarifier** au début de l'aperçu, exposer ce qui est connu et inconnu et demander les faits manquants. Inscrire aussi l'incertitude dans l'audit ; ne pas présenter la note comme prête à valider.

### Explications et vocabulaire

Écrire en français pour une personne découvrant le projet avec la seule documentation produit. Expliquer le cas concret et l'effet du changement ; ne pas paraphraser un commit et ne pas obliger à lire le ticket pour comprendre. Regrouper par usages ou publics, pas par modules internes.

Employer **socle** plutôt que « plateforme » dans la prose. Préserver les noms exacts de rôles, boutons, permissions et autres libellés de l'interface. Par exemple, le rôle « Sécurité Plateforme » garde son nom ; ses droits de consultation se distinguent du caractère non modifiable de sa définition. Ne pas confondre ces deux propriétés ni en déduire une impossibilité de gérer ses membres.

Expliquer le reprovisionnement comme la remise en conformité des ressources avec la **configuration déclarative** du projet : celle-ci décrit l'état attendu. Préciser ce qui est synchronisé plutôt que d'employer « synchronisation » sans objet. Introduire les termes nécessaires, comme « coffre Vault », avant leur équivalent technique.

### Documentation pour chaque changement

Chaque entrée publique comporte le lien de la page ou section qui explique le fonctionnement concerné sur `https://cloud-pi-native.fr/`, en complément du ticket ou de la PR. Lire le contenu et vérifier sa pertinence pour le comportement livré ; un HTTP 200 ne suffit pas. Un lien ne remplace pas l'explication dans la note ni les consignes d'une action obligatoire.

Si la documentation manque, est incomplète ou obsolète, ne pas inventer de lien, ne pas renvoyer à l'accueil et ne pas supprimer le changement pour cacher le manque. Dans l'aperçu, indiquer honnêtement « Documentation à compléter » plutôt que présenter un lien non pertinent comme suffisant. Consigner le manque et la correction attendue dans l'audit, puis demander une décision de correction avant approbation du contenu. Un timeout laisse la vérification en attente : afficher « Documentation non vérifiée », sans prétendre que la page manque ou doit être corrigée avant de l'avoir lue. Ne jamais présenter une action non documentée et non clarifiée comme prête à appliquer.

## Audit — `CHANGELOGS/<version-stable>.anomalies.md`

```markdown
# Audit de la Release Note <version stable>

- Plage examinée : `<tag stable précédent>...<tag candidat>`
- Milestone : <URL>
- MR Helm : <URL>

## Prévus mais non livrés

- <ticket et preuve d'absence de changement atteignable>

## Livrés sans milestone ou avec mauvais milestone

- <MR ou commit, milestone observé, décision humaine>

## Rattachements antérieurs

- <ticket, MR et version antérieure de livraison vérifiée>

## Changements techniques exclus

- <commit et raison d'exclusion>

## Manques documentaires et vérifications en attente

- **Changement :** <ticket et fonctionnement concerné>.
  **État :** <absent, incomplet, obsolète ou non vérifié>.
  **Page ou recherche :** <URL et contenu observé, ou périmètre recherché>.
  **Manque :** <explication ou procédure absente, différente ou non vérifiable>.
  **Correction ou vérification attendue :** <contenu à ajouter/corriger ou source à relire>.
  **Suivi :** ouvert — <décision humaine, référence de suivi si elle existe>.
  **Preuve de résolution :** <à renseigner seulement après lecture du contenu corrigé>.

## Actions à clarifier

- <changement, public/étapes/échéance/risque à confirmer et question à trancher>
```

L'audit est séparé et non publiable. Il garde les décisions humaines exceptionnelles et le suivi documentaire afin que la prochaine RC puisse les réexaminer. Présenter explicitement les manques et incertitudes à l'utilisateur avant l'approbation ; ne jamais les masquer pour accélérer la communication. Leur simple signalement n'est pas une correction : les garder ouverts jusqu'à vérification du contenu corrigé et conserver la preuve de résolution. Une vérification impossible ne devient pas une absence démontrée. Ne pas créer de ticket ni modifier la documentation externe sans périmètre autorisé séparément.

## Rendu Mattermost

Lire directement `references/mattermost.md` depuis `SKILL.md` avant de préparer l'annonce. L'annonce peut résumer les changements ; chaque entrée conservée garde son lien documentaire et sa référence technique. Aucune action obligatoire ne peut être supprimée ou réduite à un renvoi vers la note complète.

## Description de la Release GitHub

Après validation explicite de la note, mettre à jour la description de la Release GitHub existante correspondant au tag candidat. Son corps reprend exactement le contenu de `CHANGELOGS/<version-stable>.md` sans le frontmatter YAML, avec les avertissements en tête et tous les liens documentaires, mais sans l'audit. Vérifier le tag et l'URL de la Release ; ne modifier que sa description, sans publier la Release ni changer son statut draft/prerelease.
