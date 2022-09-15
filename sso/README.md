# keycloak 


## Pour le mode developpement

### Lancer keycloak seul


```
docker compose -f docker-compose.dev.keycloak.yml up
```

URL de la page admin:  http://localhost:8090/admin
login: admin
mot de passe: admin


## Reférence documentaire

### Celui utilise ici:
https://www.keycloak.org/getting-started/getting-started-docker

### Autres documentations utile:
* [Keycloak](https://github.com/keycloak/keycloak) - Keycloak Server and Java adapters
* [Keycloak Documentation](https://github.com/keycloak/keycloak-documentation) - Documentation for Keycloak
* [Keycloak QuickStarts](https://github.com/keycloak/keycloak-quickstarts) - QuickStarts for getting started with Keycloak
* [Keycloak Node.js Connect](https://github.com/keycloak/keycloak-nodejs-connect) - Node.js adapter for Keycloak
* [Keycloak Node.js Admin Client](https://github.com/keycloak/keycloak-nodejs-admin-client) - Node.js library for Keycloak Admin REST API