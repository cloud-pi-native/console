# Introduction

Plugin de gestion du plugin Vault

## Configuration

| Env var                                | valeur possible | description                                                                                                                                        |
| -------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| VAULT_TOKEN                            | chaine          | Root token ou token ayant les pleins droits sur le Vault                                                                                           |
| VAULT_URL                              | _url_           | Url public d'accès au Vault                                                                                                                        |
| VAULT_INTERNAL_URL                     | _url_ ou vide   | Url par laquelle la console interroge le service Vault, si absent utilisation de l'url public                                                      |
| VAULT\_\_HIDE_PROJECT_SERVICE          | "true" ou vide  | Décide si le plugin masque ou non le service dans l'interface du projet. Ne désactive pas la fonctionnalité du store projet seulement l'affichage. |
| VAULT\_\_DISABLE_VAULT_SECRETS         | "true" ou vide  | Désactiver le déploiement des ressources nécessaires au Vault Secret Operator dans le namespace cible                                              |
| VAULT\_\_DEPLOY_VAULT_CONNECTION_IN_NS | "true" ou vide  | Activer le déploiement du vaultconnections dans le namespace utilisateur, si vide ou faux, s'assure que la ressource n'existe pas                  |
