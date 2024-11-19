# Introduction

Plugin de gestion du plugin Vault

# Configuration

| Env var                     | valeur possible | description                                                                                                                                        |
| --------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| VAULT_TOKEN                 | chaine          | Root token ou token ayant les pleins droits sur le Vault                                                                                           |
| VAULT_URL                   | *url*           | Url public d'accès au Vault                                                                                                                        |
| VAULT_INTERNAL_URL          | *url* ou vide   | Url par laquelle la console interroge le service Vault, si absent utilisation de l'url public                                                      |
| VAULT__HIDE_PROJECT_SERVICE | "true" ou vide  | Décide si le plugin masque ou non le service dans l'interface du projet. Ne désactive pas la fonctionnalité du store projet seulement l'affichage. |
