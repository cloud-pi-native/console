# avancement connectors

## Create DSO Project

0 KO mais attention sonarqube :

- users bien créé
- apparemment on ne crée pas de projet ni groupe ni permissions

## Mirroring

- problème liaison vault gitlab

Y'a un `.` en trop dans `gitlab-op.{{ ROOT_DOMAIN }}`, du coup la variable dans vault c'est : `iss: gitlab-op..apps.ocp4-7.infocepo.com`

## Delete DSO project

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
