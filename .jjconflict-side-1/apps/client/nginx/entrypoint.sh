#!/bin/sh

ASSETS_DIR=/etc/nginx/html/assets

make_envsubst_vars() {
  fmt=
  for name do
    fmt="${fmt}${fmt:+ }\${$name}"
  done

  printf '%s\n' "$fmt"
}

ENV_VARS=$(make_envsubst_vars \
  SERVER_HOST \
  SERVER_PORT \
  OPENCDS_ENABLED \
  KEYCLOAK_PROTOCOL \
  KEYCLOAK_DOMAIN \
  KEYCLOAK_REALM \
  KEYCLOAK_CLIENT_ID \
  KEYCLOAK_REDIRECT_URI \
  CONTACT_EMAIL \
)

echo "Replacing env variables in JavaScript asset files..."
for file in $ASSETS_DIR/*.js; do
  echo "Processing $file ...";
  envsubst "${ENV_VARS}" \
    < $file \
    > $file-out && \
    mv $file-out $file
done
echo "Done !"
