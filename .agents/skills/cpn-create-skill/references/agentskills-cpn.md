# Profil Agent Skills CPN

## Emplacement et identifiant

Créer `.agents/skills/<nom>/SKILL.md`. `name` est exactement `<nom>`, commence par `cpn-` et contient uniquement des minuscules, chiffres et tirets. Il ne commence ni ne finit par un tiret et ne contient pas `--`.

## Frontmatter

Le frontmatter YAML contient `name` et `description`. Ajouter `license`, `compatibility`, `allowed-tools` ou `metadata` uniquement s’ils sont justifiés. Mettre la version dans `metadata.version`, pas dans un champ racine non standard.

La description commence par `Use when`, couvre la capacité et ses déclencheurs concrets, et contient les mots-clés utiles à la découverte. Elle ne résume pas le parcours du skill : le corps porte les étapes.

## Contenu et ressources

Le corps utilise l’impératif, définit entrées, sorties, décisions, erreurs et vérifications. Garder les instructions courantes dans `SKILL.md`; placer les scripts déterministes dans `scripts/`, les références lourdes dans `references/` et les modèles dans `assets/`. Référencer ces fichiers depuis `SKILL.md` par un chemin relatif direct, sans chaîne de références profonde.

## Contrôle

Utiliser `skills-ref validate .agents/skills/<nom>` lorsque la commande existe. Sinon, documenter le contrôle manuel : répertoire égal à `name`, nom conforme, frontmatter YAML lisible, `name` et `description` non vides, ressources référencées présentes et chemins relatifs directs.
