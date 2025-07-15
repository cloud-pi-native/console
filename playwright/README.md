# À propos

Ce dossier contient tout ce qui nous est nécessaire pour lancer les tests automatisés avec Playwright.

Il peut s'agir de tests E2E, d'une brique en particulier, bref tout ce qui est actionnable à partir de l'interface utilisateur.

## Installer Playwright

Tout est déjà prévu dans le `pnpm install` que vous avez normalement déjà exécuté à la racine du MonoRepo. Si ce n'est pas le cas vous pouvez relancer la commande dans ce dossier.

## Installer les dépendances (navigateurs, etc.)

Afin de pouvoir lancer les tests sur différents navigateurs, Playwright a besoin d'un certain nombre de binaires.
Pour les installer localement il faut lancer la commande suivante :

```shell
$ pnpm exec playwright install --with-deps
```

Note: Il est possible qu'il soit nécessaire que vous fassiez un `sudo`

## Lancer les tests

Il faut d'abord lancer une stack, par ex, celle de Dev:

```shell
$ pnpm run docker:dev
```
On peut ensuite lancer ensuite les tests :

```shell
$ pnpm run playwright:test
```

OU (autre possibilité), lancer la "console" Playwright pour parcourir/exécuter les tests manuellement :

```shell
$ pnpm run playwright:test:ui
```
