#!/bin/bash

# Substitue les variables d'environnement dans le template de routing
# Les variables substituées : LEGACY_UPSTREAM, NESTJS_UPSTREAM
envsubst '${LEGACY_UPSTREAM} ${NESTJS_UPSTREAM}' \
  < /opt/bitnami/nginx/conf/server_blocks/routing.conf.template \
  > /opt/bitnami/nginx/conf/server_blocks/routing.conf

echo "Routing configuration generated with:"
echo "  LEGACY_UPSTREAM=${LEGACY_UPSTREAM}"
echo "  NESTJS_UPSTREAM=${NESTJS_UPSTREAM}"
