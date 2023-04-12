# avancement connectors

## Create DSO Project

0 KO mais attention sonarqube :

- users bien créé
- apparemment on ne crée pas de projet ni groupe ni permissions

## Mirroring

- problème liaison vault gitlab

Y'a un `.` en trop dans `gitlab-op.{{ ROOT_DOMAIN }}`, du coup la variable dans vault c'est : `iss: gitlab-op..apps.ocp4-7.infocepo.com`

## Delete DSO project

- problème suppression groupe keycloak

```log
TypeError: Cannot read properties of undefined (reading 'subGroups')
at Object.deleteKeycloakEnvGroup [as keycloak] (file:///app/apps/server/src/plugins/core/keycloak/index.js:108:35)
at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
at async Promise.all (index 0)
at async executeStep (file:///app/apps/server/src/plugins/index.js:16:19)
at async Object.execute [as deleteEnvironment] (file:///app/apps/server/src/plugins/index.js:40:15)
at async Object.archiveProjectController (file:///app/apps/server/src/controllers/project.js:357:26)
```

- attention sonarqube :

- 0 users retrouvés dans `deleteUser`

```js
  "sonarqube": {
    "status": {
      "result": "OK",
      "message": "Already missing"
    }
  }
```
