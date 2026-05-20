FROM docker.io/bitnamilegacy/nginx:1.29.1 AS prod

USER 0

# Template de routing (sera substitué au démarrage)
COPY --chown=1001:0 --chmod=660 apps/nginx-strangler/conf.d/routing.conf /opt/bitnami/nginx/conf/server_blocks/routing.conf.template

# Script d'entrypoint pour substitution des variables
COPY --chown=1001:0 --chmod=770 apps/nginx-strangler/entrypoint.sh /docker-entrypoint-initdb.d/load-routing.sh

USER 1001

EXPOSE 8080
