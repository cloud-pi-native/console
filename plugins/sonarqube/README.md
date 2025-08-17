# Introduction

Ce plugin permet de créer des projets Sonarqube à la demande.

# Configuration

| Env var                | valeur possible | description                                                                                       |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| SONAR_API_TOKEN        | chaine          | Mot de passe Sonarqube                                                                            |
| SONARQUBE_URL          | *url*           | Url public d'accés au Sonarqube                                                                   |
| SONARQUBE_INTERNAL_URL | *url* ou vide   | url par laquelle la console interroge le service Sonarqube, si absent utilisation de l'url public |
