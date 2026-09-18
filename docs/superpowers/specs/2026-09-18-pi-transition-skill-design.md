# Conception — skill de transition de PI

## Contexte

`RELEASE.md` décrit le flux de versionnement technique de `console`. La transition entre deux Product Increments (PI) doit rendre ce flux lisible dans le Projet Socle GitHub : les issues ouvertes sont planifiées dans la prochaine itération et les issues fermées sont contrôlées pour que leurs métadonnées de release restent cohérentes.

## Objectif

Créer le skill projet `cpn-pi-transition`, dans `.agents/skills/cpn-pi-transition/SKILL.md`, pour piloter une transition de PI dans le Projet Socle GitHub.

Le skill :

- inventorie les issues ouvertes et fermées concernées ;
- applique une règle de transition explicitement confirmée ;
- sépare strictement audit, proposition, écriture et vérification ;
- produit un état exploitable par les équipes non techniques.

Il ne crée pas de release, de tag, de branche, de Pull Request ou de communication externe. Ces sujets restent respectivement dans `RELEASE.md` et un futur skill de communication.

## Entrées obligatoires

Avant toute lecture ou écriture, le skill identifie ou demande :

- le dépôt, le Projet Socle, le champ d’itération (par défaut `PI`) et l’itération source ;
- l’itération cible ;
- la règle de traitement des issues ouvertes, y compris le milestone à attribuer lorsqu’il est absent ;
- la règle de cohérence des issues fermées, par exemple `PI17 5` attendu avec le milestone `9.26.0` ;
- le périmètre d’audit des issues fermées sans valeur `PI` : items fermés du Projet ou fenêtre/release explicitement fournie.

Le skill ne déduit jamais une version cible à partir du seul nom d’un PI.

## Flux de travail

### 1. Prévol en lecture seule

1. Vérifier l’authentification GitHub et les scopes : `read:project` pour l’audit ; `project` avant toute mutation.
2. Lire les champs du Projet et les itérations disponibles ; confirmer l’existence de la cible.
3. Lister les items du Projet pour le dépôt demandé ; ne retenir que les `Issue`, jamais les Pull Requests ou brouillons.
4. Interroger l’état GitHub des issues afin de ne jamais assimiler le statut du Projet à l’état ouvert/fermé de l’issue.

Un scope absent, une cible inconnue ou une règle incomplète arrête le processus sans mutation.

### 2. État des lieux et décision

Le skill présente deux tableaux séparés :

- **Issues ouvertes de l’itération source** : numéro, titre, statut Projet, assignees, milestone, action proposée et exception éventuelle.
- **Issues fermées du périmètre** : numéro, PI, milestone, statut Projet et écarts de cohérence.

Une issue GitHub ouverte marquée `Done` dans le Projet est une exception signalée, pas une fermeture à inférer. Une issue fermée avec un statut Projet non terminal, sans PI, sans milestone ou avec un milestone incompatible est une anomalie à examiner.

Le skill demande une validation explicite qui reprend la liste des tickets et des champs à modifier. Une instruction vague telle que « corrige les anomalies » ne vaut pas autorisation d’écriture.

### 3. Écriture après validation

Les mutations sont limitées aux champs approuvés :

1. mettre à jour l’itération des issues ouvertes sélectionnées ;
2. attribuer un milestone aux issues sans milestone lorsque la règle approuvée le demande ;
3. corriger les valeurs PI ou milestones des issues fermées uniquement si elles figurent dans la liste validée.

Un milestone existant est préservé par défaut. Le skill ne ferme, ne rouvre, ne déplace pas hors du Projet et ne modifie pas les labels, assignees ou statuts Projet sans instruction explicite.

Les deux commandes de mutation sont distinctes : `gh project item-edit` pour l’itération et `gh issue edit --milestone` pour le milestone. Un échec interrompt la phase en cours ; le rapport précise les mutations déjà confirmées.

### 4. Vérification et rapport

Après écriture, le skill relit chaque issue ciblée :

- l’état GitHub reste celui attendu ;
- l’itération correspond exactement à la cible ;
- le milestone correspond exactement à la règle approuvée ou a été préservé ;
- les écarts fermés non approuvés restent visibles dans le rapport.

La vérification doit interroger les items ciblés, plutôt que relister tout le Projet, afin de limiter le coût GraphQL et les risques de limite d’API.

## Cas d’erreur

- **Scope insuffisant** : indiquer la commande `gh auth refresh -s read:project` ou `gh auth refresh -s project` adaptée ; ne pas poursuivre.
- **Limite d’API ou échec partiel** : ne pas rejouer aveuglément ; relire les items concernés, rendre l’état exact, puis reprendre seulement les mutations manquantes après validation.
- **Issue absente du Projet** : la signaler comme non auditable au titre du champ PI ; ne pas l’ajouter au Projet sans validation distincte.

## Critères d’acceptation

- Le skill est découvrable depuis `.agents/skills/` et son frontmatter respecte l’Agent Skills standard.
- Une exécution d’audit ne réalise aucune mutation.
- Toute mutation dépend d’une validation explicite, détaillée par ticket et champ.
- Les issues ouvertes, fermées et les Pull Requests sont distinguées correctement.
- Les valeurs d’itération et de milestone sont vérifiées après mutation.
- Les anomalies d’issues fermées sont signalées et ne sont corrigées qu’après validation explicite.
