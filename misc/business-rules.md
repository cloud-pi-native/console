# Console Cloud π Native

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
| Url du dépôt Git externe                        | string  | obligatoire, regex(^<https://)>             |
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
| 0              | r                         | Lecture       |
| 1              | rw                        | + Ecriture    |
| 2              | rwd                       | + Suppression |

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

// Get project owner
get('/projects/:projectId/owner')

// Update project
put('/projects/:projectId')

// Delete project
delete('/projects/:projectId')
```

### Users

```js
// Get user by letter match on email
  get('/projects/:projectId/users/match?letters=abc')
  
// Add user to project
post('/projects/:projectId/users')
  => body({ email, role })

// Update user role in project team
put('/projects/:projectId/users/:userId')
  => body({ role })

// Get project users
get('/projects/:projectId/users')

// Remove user from project team
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

// Get repository by id
get('/:projectId/repositories/:repositoryId')

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

// Delete environment permission
delete('/projects/:projectId/environments/:environmentId/permissions/:userId')
```

### Organizations

```js
// Get active organizations
get('/', getActiveOrganizationsController)
```

### Services

```js
// Check services health
get('/', checkServicesHealthController)
```

### ADMIN Organizations

```js
// Create an organization
post('/', createOrganizationController)

// Update an organization
put('/:orgName', updateOrganizationController)

// Synchronize organizations with plugins
put('/sync/organizations', fetchOrganizationsController)

// Get all organizations
get('/', getAllOrganizationsController)
```

### ADMIN Projects

```js
// Get all projects
get('/', getAllProjectsController)
```

### ADMIN Users

```js
// Get all users
get('/', getUsersController)
```

---

## TODO: Idées

### Admin

- Lister chacune des tables
- Import / Export de données depuis des fichiers (csv, json ...)
- Possibilité pour un admin de modifier des ressources sans faire parti du projet
- Possibilité d'unlock un projet / rejouer les plugins pour un projet ou une ressource
- Mise en place d'une table d'historisation des status des projets
- Mettre en place un point d'api pour gérer l'équipe d'admin (création/suppression)
- Possibilité de réexecuter dans keycloak les droits présents dans la DB (synchro DB - keycloak)
- Route qui récapitule l'ensemble des ressources argo et supprime toutes les autres
