# Keycloak

## Development

### Start only keycloak

Go at the root level of the git project :

```sh
# Go at the root level of the git project
cd `git rev-parse --show-toplevel`

# Start keycloak
docker compose -f ./docker/docker-compose.dev.yml up keycloak
```

Admin page url:  <http://localhost:8090/admin>

__*Login:*__ `admin`
__*Password:*__ `admin`

## Docs

### Get Started

<https://www.keycloak.org/getting-started/getting-started-docker>

### Other doc

* [Keycloak](https://github.com/keycloak/keycloak) - Keycloak Server and Java adapters
* [Keycloak Documentation](https://github.com/keycloak/keycloak-documentation) - Documentation for Keycloak
* [Keycloak QuickStarts](https://github.com/keycloak/keycloak-quickstarts) - QuickStarts for getting started with Keycloak
* [Keycloak Node.js Connect](https://github.com/keycloak/keycloak-nodejs-connect) - Node.js adapter for Keycloak
* [Keycloak Node.js Admin Client](https://github.com/keycloak/keycloak-nodejs-admin-client) - Node.js library for Keycloak Admin REST API
