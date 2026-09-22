# Protocole d’évaluation

## Préparer

Créer `evals/evals.json` avec au moins trois demandes réalistes : un parcours nominal, un cas limite ou ambigu et une pression pertinente. Chaque entrée fournit un identifiant stable, la demande, les fichiers d’entrée éventuels et la sortie attendue.

Dans un workspace local, créer `iteration-<n>/<scenario>/eval-metadata.json` avec l’identifiant, le prompt et les assertions. Les assertions observables sont courtes et vérifiables ; conserver l’évaluation qualitative de l’utilisateur lorsqu’une attente ne peut pas être objectivée. Versionner uniquement `evals/evals.json` : les sorties, timings, grades et répertoires d’itération restent hors Git.

## Comparer

Pour chaque scénario, exécuter le même prompt dans des contextes isolés, avec le même modèle et les mêmes outils lorsque c’est possible :

- nouveau skill : une exécution sans le skill ;
- modification : un instantané de la version précédente ;
- exécution évaluée : le skill candidat.

Lancer les deux configurations ensemble lorsque le moteur le permet. Conserver localement `output.md`, `timing.json` avec durée et jetons quand disponibles, et `grading.json` avec les champs `text`, `passed` et `evidence`.

## Décider et itérer

Une itération réussit lorsque toutes les assertions requises du candidat sont démontrées et que la comparaison ne révèle pas de régression significative. Toute rationalisation, sortie manquante ou assertion échouée devient une correction ciblée suivie d’une nouvelle itération.

Si deux exécutions isolées ne sont pas possibles, demander le moyen de les réaliser ou déclarer l’évaluation bloquée. Une relecture seule ne remplace jamais la comparaison.
