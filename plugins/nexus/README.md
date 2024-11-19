# Introduction

Ce plugin permet de déployer des dépôts à la demande sur nexus. Les seules technologies prisent en charge actuellement sont Maven et NPM.

# Configuration

| Env var                | valeur possible | description                                                                                   |
| ---------------------- | --------------- | --------------------------------------------------------------------------------------------- |
| NEXUS_ADMIN            | chaine          | Nom d'utilisateur admin Nexus                                                                 |
| NEXUS_ADMIN_PASSWORD   | chaine          | Mot de passe Nexus                                                                            |
| NEXUS_URL              | *url*           | Url public d'accés au Nexus                                                                   |
| NEXUS_INTERNAL_URL     | *url* ou vide   | url par laquelle la console interroge le service Nexus, si absent utilisation de l'url public |
| NEXUS__SECRET_EXPOSE_INTERNAL_URL | "true" ou vide  | Exposition ou non de l'url interne dans la remontée des secrets du projet                     |
