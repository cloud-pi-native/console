# Portail Cloud PI Native

## Règles métier

### Formulaire de commande d'un espace projet

|Champ|Type|Description|
|---|---|---|
| E-mail | string | obligatoire, regex type e-mail |
| Nom de l'organisation | string | obligatoire |
| Nom du projet | string | obligatoire, regex pas d'espace |
| Nom du dépôt Git | string | obligatoire si je souhaite déposer un projet Git, regex pas d'espace |
| Nom du dépôt Git source | string | obligatoire si l'un des champs relatif au dépôt source est renseigné |
| Reponsable | string | obligatoire si le nom du dépôt source est renseigné |
| Dépôt source privé | boolean | |
| Token d'accès au Git source | string | obligatoire en cas de dépôt source privé |
