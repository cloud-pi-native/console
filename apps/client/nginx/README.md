# Nginx du client

`default.conf` sert la SPA dans l’image client. Le chart de déploiement reste responsable de son routage API.

`default.docker.conf`, monté par la stack CI, sert la même SPA et transmet directement les chemins `/api/` et `/swagger-ui-server-nestjs` à `server-nestjs:3001`. Les autres préfixes API/Swagger et `/api` sans chemin renvoient 404, jamais la SPA.

Le proxy conserve les en-têtes de transfert, WebSocket, CORS et les buffers nécessaires aux jetons Keycloak. En développement, Vite assure le proxy direct vers le même backend.

Vérification sans stack applicative :

```bash
bash ci/scripts/test-client-routing.sh
```

Les sources de l’ancien proxy de migration sont conservées comme historique, mais aucun `nginx-strangler` n’est utilisé par les stacks courantes. Le retrait en production et l’alignement du chart restent suivis dans #2895.
