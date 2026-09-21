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

## Objectif(s) de cette version

- <objectif intelligible, avec liens vers les tickets>

## Changements livrés

- <évolution ou correctif utilisateur, avec liens vers les tickets>

## Autres changements

- <changement utile mais secondaire, avec liens vers les tickets>
```

Écrire en français pour une personne extérieure à l’équipe. Expliquer l’effet
pour l’utilisateur plutôt que paraphraser les commits. Conserver les liens vers
les tickets qui permettent de retrouver les détails techniques.

## Audit — `CHANGELOGS/<version-stable>.anomalies.md`

```markdown
# Audit de la Release Note <version stable>

- Plage examinée : `<tag stable précédent>...<tag candidat>`
- Milestone : <URL>
- MR Helm : <URL>

## Prévus mais non livrés

- <ticket et preuve d’absence de changement atteignable>

## Livrés sans milestone ou avec mauvais milestone

- <MR ou commit, milestone observé, décision humaine>

## Rattachements antérieurs

- <ticket, MR et version antérieure de fusion>

## Changements techniques exclus

- <commit et raison d’exclusion>
```

L’audit est séparé et non publiable. Il garde les décisions humaines
exceptionnelles afin que la prochaine RC puisse les réexaminer.

## Rendu Mattermost

````markdown
@here Nouvelle release de `dso-console` ! :star-struck:

```yaml
version: <chartVersion>
appVersion: <appVersion>
```

[Contenu de la version](<URL du milestone>)
[Commits depuis la version précédente](<URL de comparaison>)

### Objectif(s) de cette version

<reprendre les objectifs de la source>

### Autres changements

<reprendre les changements livrés utiles de la source>
````

Le rendu est proposé pour relecture humaine : ne le publie pas, n’y inclus pas
l’audit, de travail prévu ni d’action webhook.
