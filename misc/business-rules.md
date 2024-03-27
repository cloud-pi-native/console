# Console Cloud π Native

## Règles métier

### Formulaire de commande d'un espace projet

| Champ                 | Type   | Description                           |
| --------------------- | ------ | ------------------------------------- |
| Nom de l'organisation | string | obligatoire                           |
| Nom du projet         | string | obligatoire, `regex([a-z0-9-]{2,53})` |

### Formulaire de synchronisation d'un dépôt

| Champ                                           | Type    | Description                               |
| ----------------------------------------------- | ------- | ----------------------------------------- |
| Nom du dépôt Git interne                        | string  | obligatoire, `regex([a-z0-9-]{2,53})`     |
| Url du dépôt Git externe                        | string  | obligatoire, `regex(^https://)`           |
| Dépôt externe privé                             | boolean | obligatoire                               |
| Nom d'utilisateur lié au token du dépôt externe | string  | obligatoire si le dépôt externe est privé |
| Token d'accès au dépôt externe                  | string  | obligatoire si le dépôt externe est privé |
| Dépôt d'infrastructure                          | boolean | obligatoire                               |

### Status et verrouillage

#### Schema

- un `project` peut avoir pour `status: Enum('initializing', 'created', 'failed', 'archived')`
- un `repository` et un `environnement` peuvent avoir pour `status: Enum('initializing', 'created', 'failed', 'deleting')`
- un `project` peut être `locked (boolean)`

#### Principe

- `initializing` : la ressource est en cours de création, des opérations sont en cours côté `plugins` - le `project` est `locked: true`
- `created` : la ressource est créée, les opérations des `plugins` se sont bien déroulées - le `project` est `locked: false`
- `failed` : la ressource est créée, les opérations des `plugins` ont échoué - le `project` est `locked: true`
- `deleting` : la ressource est en cours de suppression, des opérations sont en cours côté `plugins` - le `project` est `locked: true`
- `archived` : les opérations des `plugins` se sont bien déroulées, le projet et son équipe sont toujours présents en base de données pour archive, mais invisibles des utilisateurs hors `admin` - le `project` est `locked: true`
- `project.locked: true` : toute opération de Create / Update sur le projet et ses ressource est interdite.

### Permissions d'environnement

Trois niveaux de permissions différents,
| Valeur en base | Description dans le front | Niveaux       |
| -------------- | ------------------------- | ------------- |
| 0              | r                         | Lecture       |
| 1              | rw                        | + Ecriture    |
| 2              | rwd                       | + Suppression |

## Points d'API

voir swagger : <http://localhost:8080/api/v1/swagger-ui/static/index.html>

---

## TODO: Idées

### Admin

- Lister chacune des tables
- Mise en place d'une table d'historisation des status des projets
- Mettre en place un point d'api pour gérer l'équipe d'admin (création/suppression)
- Possibilité de réexecuter dans keycloak les droits présents dans la DB (synchro DB - keycloak)
- Route qui récapitule l'ensemble des ressources argo et supprime toutes les autres
