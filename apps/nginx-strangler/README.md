# nginx-strangler

Proxy conservé pendant la migration de `server` (Fastify/legacy) vers `server-nestjs`. Depuis [#2927](https://github.com/cloud-pi-native/console/issues/2927), aucun chemin applicatif n’est dirigé vers le legacy dans la configuration normale. Le retrait des composants reste suivi dans [#2895](https://github.com/cloud-pi-native/console/issues/2895).

## Routage

```text
client → nginx-strangler:8080
           ├── /api/*                         → server-nestjs:3001
           └── /swagger-ui-server-nestjs*     → server-nestjs:3001
```

- Le fallback `/api/` cible NestJS, y compris les variantes avec slash final et les chemins inconnus. NestJS détermine la réponse ; un chemin sans contrôleur renvoie 404.
- `/api` sans chemin renvoie 404 directement depuis nginx.
- Les routes V1 `/api/v1/environments` et `/api/v1/repositories` ne sont pas reprises : utiliser leurs équivalents V2 sous `/api/v2/projects/:projectId/` (décisions [#2925](https://github.com/cloud-pi-native/console/issues/2925) et [#2926](https://github.com/cloud-pi-native/console/issues/2926)).
- Swagger legacy est retiré, sans redirection : `/swagger-ui-server`, ses ressources et son document JSON renvoient 404. La documentation maintenue reste `/swagger-ui-server-nestjs` et `/swagger-ui-server-nestjs-json`.
- `/health` est la sonde propre au proxy, sans upstream.

## Variables d’environnement

| Variable | Usage | Docker | Développement natif avec proxy Docker |
|---|---|---|---|
| `NESTJS_UPSTREAM` | Destination des requêtes applicatives | `server-nestjs:3001` | `host.docker.internal:3001` |
| `LEGACY_UPSTREAM` | Upstream conservé pour un retour arrière explicite | `server:8080` | `host.docker.internal:4001` |

L’image substitue ces variables dans `conf.d/routing.conf` via `envsubst`. Le bloc upstream legacy reste déclaré mais aucune location ne l’utilise.

## Accès directs et probes

| Accès | Traitement |
|---|---|
| Docker dev/integ : port HTTP legacy 4001 | Publication limitée à `127.0.0.1`, pour diagnostic local ou retour arrière ; ne pas l’utiliser pour les parcours applicatifs. |
| Docker CI | Aucun port HTTP legacy publié sur l’hôte. Le service reste accessible sur le réseau interne pour les besoins techniques. |
| Backends natifs (`pnpm dev`) | Le legacy reste joignable sur son port natif 4001 ; le client doit utiliser le proxy sur 4000. Ne pas exposer le port natif à des consommateurs applicatifs. |
| Réseau interne Docker / Service Kubernetes legacy | Conservation technique, sans suppression ni modification de `apps/server`. Toute intégration ou ingress personnalisé pointant directement dessus doit être réorienté vers le proxy avant la qualification. |
| Probes legacy du chart | Trafic technique conservé, distinct des parcours applicatifs ; il n’est pas couvert par une promesse de « zéro requête legacy ». |

Le chart appartient au dépôt externe `cloud-pi-native/helm-charts`. Vérifier la version réellement déployée, ses ingress, Services, NodePorts/LoadBalancers et les éventuelles règles personnalisées ; les fichiers de ce dépôt ne prouvent pas l’absence d’accès direct sur un cluster.

## Vérifier

```bash
# nginx réel et deux upstreams témoins ; nettoyage automatique
bash ci/scripts/test-strangler-routing.sh

# Sur une stack lancée, préciser le fichier Compose utilisé
# Exemple pour la stack de développement :
docker compose -f docker/docker-compose.dev.yml exec nginx-strangler nginx -t
docker compose -f docker/docker-compose.dev.yml logs -f nginx-strangler
```

Le test isolé vérifie les destinations, méthodes et query strings, les variantes de slash, les routes V1 retirées, Swagger et l’absence de requête au témoin legacy. Il ne valide pas le comportement métier NestJS : compléter avec `pnpm docker:e2e-ci`, puis `pnpm docker:e2e-ci:delete`, même en cas d’échec.

Pour la campagne de recette du candidat déployé, consigner le commit/configuration rendue, les digests des images et la version/les valeurs du chart. Pendant les parcours, relever les logs nginx (`upstream=...`), rapprocher les adresses des pods, et distinguer les probes dans les logs legacy. Ne solder le volet déployé de #2927 qu’avec ces preuves et l’inventaire des expositions directes du cluster.

## Retour arrière explicite

**Commenter une location ne rétablit plus le legacy** : le fallback cible désormais NestJS.

1. Sauvegarder la configuration déployée et identifier les routes à rétablir.
2. Pour chaque route concernée, remplacer son `proxy_pass` par `http://server-legacy` ; ajouter une location spécifique si elle n’existe pas. Pour un retour arrière global, rétablir aussi le fallback `/api/` vers legacy ; les locations spécifiques NestJS restent prioritaires et doivent être traitées explicitement.
3. Valider avec `nginx -t`, puis recharger avec `nginx -s reload` via le fichier Compose ou le déploiement concerné. Pour une configuration embarquée dans l’image, déployer une image contenant la configuration de retour arrière, ou revenir à l’image précédente compatible.
4. Vérifier les réponses et l’upstream dans les logs ; consigner cette réouverture du trafic legacy. Ne pas rétablir Swagger legacy pour une simple bascule API.

Le backend legacy et nginx-strangler sont conservés. La procédure ne présume pas de la compatibilité des données ou des intégrations après migration : la vérifier avant tout retour arrière.
