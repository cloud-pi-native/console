#!/bin/sh

ROOT_DIR=/opt/bitnami/nginx/html
ENV_DIR=/env

populate () {
  if [ -z $(eval "echo \${$1}") ]; then
    VAR="$(grep "^$1" ${ENV_DIR%/}/.env | xargs)"
    if [ ! -z "$VAR" ]; then
      export "$(grep "^$1" $ENV_DIR/.env | xargs)"
    fi
  fi

  KEY=$(echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/_/-/g')
  VALUE=$(eval "echo \${$1}")
  sed -i 's|'${KEY}'|'${VALUE}'|g' $2
}


echo "Replacing env constants in JS"
for file in ${ROOT_DIR%/}/assets/index*.js; do
  echo "Processing $file ...";

  populate SERVER_HOST $file
  populate SERVER_PORT $file
  populate KEYCLOAK_PROTOCOL $file
  populate KEYCLOAK_DOMAIN $file
  populate KEYCLOAK_REALM $file
  populate KEYCLOAK_CLIENT_ID $file
  populate KEYCLOAK_REDIRECT_URI $file
done

export SERVER="$SERVER_HOST:$SERVER_PORT"
cat /default.conf.tpl | envsubst '$SERVER' > /opt/bitnami/nginx/conf/server_blocks/default.conf

nginx -g 'daemon off;'
