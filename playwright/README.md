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

## Lancer la suite E2E

La suite E2E Playwright nécessite les fixtures et les données de la stack CI (`pnpm docker:ci`).
`docker:e2e-ci` est le seul lanceur de la suite complète ; `docker:dev` ne convient pas.

Si les fichiers d'environnement requis n'existent pas encore, les créer sans écraser les fichiers
présents :

```shell
$ bash ci/scripts/init-env.sh
```

Si une stack de développement tourne déjà, l'arrêter avant de démarrer la stack CI :

```shell
$ pnpm docker:dev:clean
```

Lancer la suite complète et nettoyer la stack et ses volumes après le résultat, y compris en cas
d'échec :

```shell
$ pnpm docker:e2e-ci
$ pnpm docker:e2e-ci:delete
```

Pour diagnostiquer manuellement une spec, démarrer la stack CI séparément, lancer le test ciblé,
puis arrêter les conteneurs. Ce parcours n'est pas le lanceur de la suite complète :

```shell
$ pnpm docker:ci
$ pnpm --dir playwright exec playwright test e2e-tests/dashboard.spec.ts -g 'Should display a project statuses'
$ pnpm docker:ci:clean
```

Pour les tests d'intégration, exporter au préalable les variables d'environnement suivantes :

```shell
$ export KEYCLOAK_DOMAIN=keycloak.example.com
$ export KEYCLOAK_REDIRECT_URI=https://console.example.com
$ export KEYCLOAK_PROTOCOL=https
$ export KEYCLOAK_ADMIN_USERNAME=<admin_username>
$ export KEYCLOAK_ADMIN_PASSWORD=<admin_password>
$ export KEYCLOAK_REALM=dso
$ export CONSOLE_ADMIN_USERNAME=<admin_dso_username>
$ export CONSOLE_ADMIN_PASSWORD=<admin_dso_password>
$ export CONSOLE_ADMIN_EMAIL=<admin_dso_email>
$ export CONSOLE_TEST_USERNAME=<user_dso_username>
$ export CONSOLE_TEST_PASSWORD=<user_dso_password>
$ export CONSOLE_TEST_EMAIL=<user_dso_email>
$ export CONSOLE_SECOND_TEST_USERNAME=<another_user_dso_username>
$ export CONSOLE_SECOND_TEST_PASSWORD=<another_user_dso_password>
$ export CONSOLE_SECOND_TEST_EMAIL=<another_user_dso_email>
$ export CONSOLE_GLOBAL_TIMEOUT='900000'
$ export CONSOLE_EXPECT_TIMEOUT='900000'
$ export CONSOLE_DESTINATION_CLUSTER=<cluster_name_where_argo_deploys_apps>
$ export CONSOLE_VALUES_FILE=<values_file_for_argo>
```

On peut lancer ensuite les tests :

```shell
$ pnpm run playwright:test:integration --grep @integ
```

## Conventions de code

Afin d'assurer la lisibilité et la maintenabilité des tests Playwright, quelques décisions ont été prises concernant l'écriture du code :
- Pas d'imbrication de if : les conditions sont autorisées dans les fonctions, mais ne doivent pas être imbriquées.
- Arguments explicites : certains arguments initialement optionnels doivent être rendus obligatoires afin de rendre le comportement de la fonction plus clair (par exemple pour les zones publiques, ou les contextes spécifiques).
- Visibilité des tests : il doit être évident, à la lecture du test, de voir ce qui est réellement vérifié. Par conséquent, évitez de masquer les expect à l'intérieur de fonctions utilitaires. Les assertions doivent apparaître directement dans le corps du test lorsqu'elles participent à la vérification d'un comportement.

Ces conventions ont pour objectif de rendre les tests plus explicites, plus faciles à relire, et de réduire les effets de bord cachés.
