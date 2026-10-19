# Rendu Mattermost

````markdown
@here Nouvelle release de `dso-console` ! :star-struck:

```yaml
version: <chartVersion>
appVersion: <appVersion>
```

### ⚠️ Actions requises pour la mise à jour

- **Qui et dans quel cas :** <public et condition précise>.
  **Quand :** <avant/après la mise à jour ou avant une opération nommée>.
  **À faire :** <étapes concrètes et ordonnées>.
  **Sans cette intervention :** <conséquence vérifiée>.
  [Procédure](<URL de la documentation pertinente>) · [Ticket](<URL>)

[Contenu de la version](<URL du milestone>)
[Commits depuis la version précédente](<URL de comparaison>)

### Objectif(s) de cette version

<reprendre le résumé de la source>

### Changements livrés

- **<titre concret>** — <situation, changement et effet pour le lecteur>.
  [Documentation](<URL pertinente, section si utile>) · [Ticket ou PR](<URL>)
````

## Priorité aux interventions nécessaires

Inclure **⚠️ Actions requises pour la mise à jour** uniquement lorsqu'une intervention est requise, toujours avant les objectifs et les changements. Sans intervention, supprimer cette rubrique et ne pas ajouter de phrase « aucune action nécessaire » ailleurs.

Reprendre toutes les actions de la source, avec leurs publics, conditions, étapes, échéances, conséquences de l'inaction et liens directs vers les procédures vérifiées. Une annonce courte ne peut pas les omettre, les placer parmi les changements ordinaires ou les remplacer par « voir le ticket » ou « voir la release note ».

Si une action reste incertaine, l'aperçu affiche **⚠️ Actions à clarifier** au même endroit, précise les inconnues et n'est pas présenté comme prêt à valider. Ne pas transformer une incertitude en consigne inventée ou en absence d'action.

## Liens et lisibilité

Les changements peuvent être regroupés ou résumés pour les équipes projet, l'administration ou l'exploitation du **socle**. Chaque entrée retenue conserve sa documentation pertinente et sa référence technique. Préserver les libellés exacts de l'interface. Expliquer le reprovisionnement par la **configuration déclarative** et distinguer les droits de consultation d'une définition de rôle non modifiable lorsque ces notions sont concernées.

Un manque documentaire ne disparaît pas dans le résumé : indiquer « Documentation à compléter » pour le changement dont la documentation est absente, incomplète ou obsolète. Pour une source inaccessible, indiquer « Documentation non vérifiée » sans affirmer que son contenu manque. Garder les détails et corrections ou vérifications attendues dans l'audit non publiable. Ne pas fabriquer de lien ni utiliser la page d'accueil comme substitut.

## Fichier temporaire, pas publication

Le rendu est proposé pour relecture humaine. Après approbation explicite, enregistrer le copier-coller dans `/tmp/dso-console-<version-stable>.mattermost.md`, sans fence Markdown englobante et hors du dépôt ; sa durée de vie est volontairement brève. Ne pas inclure l'audit ni du travail prévu. Ne jamais envoyer le message, déclencher de webhook ou publier la Release ; préserver toutes les règles de validation du skill.
