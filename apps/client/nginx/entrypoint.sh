#!/bin/sh

ROOT_DIR=/opt/bitnami/nginx/html

populate () {
  KEY=$(echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/_/-/g')
  VALUE=$(eval "echo \${$1}")
  sed -i 's|'${KEY}'|'${VALUE}'|g' $2
}


echo "Replacing env constants in JS"
for file in $ROOT_DIR/assets/*.js; do
  echo "Processing $file ...";

  populate SERVER_HOST $file
  populate SERVER_PORT $file
  populate KEYCLOAK_PROTOCOL $file
  populate KEYCLOAK_DOMAIN $file
  populate KEYCLOAK_REALM $file
  populate KEYCLOAK_CLIENT_ID $file
  populate KEYCLOAK_REDIRECT_URI $file
done

nginx -g 'daemon off;'
