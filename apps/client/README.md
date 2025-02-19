# Console Cloud π Native - Client

## Installation

```sh
npm install
```

## Lancement de l'app

```sh
npm run dev
```

## Lancement des tests unitaires

```sh
npm run test
```

## Formattage du code

```sh
# Lister les problèmes de formatage
npm run lint

# Régler automatiquement les problèmes de formatage
npm run format
```

## Build de l'app

```sh
npm run build
```

## Prévisualisation du code de production

```sh
npm run preview
```

## Récupérer toutes les icones du projets
`grep -r -oh "ri:[a-z0-9-]*" . | sort | uniq | cut -d ':' -f 2 | awk NF | awk '{print "  \047" $1 "\047,"}'`

## Crédits

- [vue](https://github.com/vuejs/)
- [vue-dsfr](https://github.com/dnum-mi/vue-dsfr)
- [vite](https://github.com/vitejs/vite)
- [stylelint](https://github.com/stylelint/stylelint)
- [eslint](https://github.com/eslint/eslint)
