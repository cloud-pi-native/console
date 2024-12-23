# Introduction

Ce plugin permet de créer des projets Harbor à la demande.

# Configuration

| Env var               | valeur possible | description                                                                                       |
| --------------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| HARBOR_ADMIN          | chaine          | Compte administrateur Harbor                                                                      |
| HARBOR_ADMIN_PASSWORD | chaine          | Mot de passe Harbor                                                                               |
| HARBOR_URL            | *url*           | Url public d'accés au Harbor                                                                      |
| HARBOR_INTERNAL_URL   | *url* ou vide   | Url par laquelle la console interroge le service Harbor, si absent utilisation de l'url public |
