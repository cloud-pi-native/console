# Console Cloud PI Native

## Règles métier

### Formulaire de commande d'un espace projet

| Champ                 | Type   | Description                         |
| --------------------- | ------ | ----------------------------------- |
| Nom de l'organisation | string | obligatoire                         |
| Nom du projet         | string | obligatoire, regex([a-z0-9-]{2,53}) |

### Formulaire de synchronisation d'un dépôt

| Champ                                           | Type    | Description                               |
| ----------------------------------------------- | ------- | ----------------------------------------- |
| Nom du dépôt Git interne                        | string  | obligatoire, regex([a-z0-9-]{2,53})       |
| Url du dépôt Git externe                        | string  | obligatoire, regex(^https://)             |
| Dépôt externe privé                             | boolean | obligatoire                               |
| Nom d'utilisateur lié au token du dépôt externe | string  | obligatoire si le dépôt externe est privé |
| Token d'accès au dépôt externe                  | string  | obligatoire si le dépôt externe est privé |
| Dépôt d'infrastructure                          | boolean | obligatoire                               |


## Point d'api

### Projects

```js
// Create project
post('/projects')
  => body({ name, organization })

// Get user projects
get('/projects')

// Get user project
get('/projects/:projectId')

// Delete project
delete('/projects/:projectId')
```

### Users

```js
// Add user in project
post('/projects/:projectId/users')
  => body({ email, role })

// Update user role in project team
put('/projects/:projectId/users/:userId')
  => body({ role })

// Get project users
get('/projects/:projectId/users')

// Delete user in project team
delete('/projects/:projectId/users/:userId')
```

### Repositories

```js
// Add repository in project
post('/projects/:projectId/repositories')
  => body({ internalRepoName, externalRepoUrl, _externalUserName, _externalToken, isInfra, isPrivate })

// Update project repository
put('/projects/:projectId/repositories/:repositoryId')
  => body({ externalRepoUrl, _externalUserName, _externalToken, isPrivate })

// Get project repositories
get('/projects/:projectId/repositories')

// Delete project repository
delete('/projects/:projectId/repositories/:repositoryId')
```

### Environments

```js
// Add environment in project
post('/projects/:projectId/environments')
  => body({ name })

// Get project environments
get('/projects/:projectId/environments')

// Delete project environment
delete('/projects/:projectId/environments/:environmentId')
```

### Permissions

```js
// Add permission in environment (add or update => upsert)
post('/projects/:projectId/environments/:environmentId/permissions')
  => body({ userId, level })

// Update permission in environment (add or update => upsert)
put('/projects/:projectId/environments/:environmentId/permissions')
  => body({ userId, level })

// Get environment permissions
get('/projects/:projectId/environments/:environmentId/permissions')

// Delete project environment
delete('/projects/:projectId/environments/:environmentId/permissions')
  => body({ userId })
```

---
## TODO: Idées
### Admin

- Lister chacune des tables
- Import / Export de données depuis des fichiers (csv, json ...)
- Modification du label d'une organisation
- Possibilité pour un admin de modifier des ressources sans faire parti du projet
- Possibilité d'unlock un projet / rejouer les playbooks pour un projet
- Mise en place d'une table d'historisation des status des projets
- Mettre en place un point d'api pour gérer l'équipe d'admin (création/suppression)
- Possibilité de réexecuter dans keycloak les droits présents dans la DB (synchro DB - keycloak)
- Route qui récapitule l'ensemble des ressources argo et supprime toutes les autres