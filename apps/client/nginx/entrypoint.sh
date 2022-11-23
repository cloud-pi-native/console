#!/bin/sh

ROOT_DIR=/usr/share/nginx/html

echo "Replacing env constants in JS"
for file in $ROOT_DIR/assets/index.*.js; do
  echo "Processing $file ...";

  sed -i 's|server-host|'${SERVER_HOST}'|g' $file
  sed -i 's|server-port|'${SERVER_PORT}'|g' $file
  sed -i 's|keycloak-domain|'${KEYCLOAK_DOMAIN}'|g' $file
  sed -i 's|keycloak-realm|'${KEYCLOAK_REALM}'|g' $file
  sed -i 's|keycloak-client-id|'${KEYCLOAK_CLIENT_ID}'|g' $file
  sed -i 's|keycloak-redirect-uri|'${KEYCLOAK_REDIRECT_URI}'|g' $file
done

nginx -g 'daemon off;'
