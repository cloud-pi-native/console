#!/bin/sh

ROUTING_CONFIG_FILE=/etc/nginx/conf.d/routing.conf

echo "Replacing env constants in NGINX configuration"
sed -i "s|\${LEGACY_UPSTREAM}|${LEGACY_UPSTREAM}|g" $ROUTING_CONFIG_FILE
sed -i "s|\${NESTJS_UPSTREAM}|${NESTJS_UPSTREAM}|g" $ROUTING_CONFIG_FILE

nginx -t

nginx -g 'daemon off;'
