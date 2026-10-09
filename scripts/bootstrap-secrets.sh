#!/usr/bin/env bash

set -euo pipefail

if ! command -v pass >/dev/null 2>&1; then
  printf 'pass is required; install and initialize it with your GPG identity before running this command.\n' >&2
  exit 1
fi

if ! command -v fnox >/dev/null 2>&1; then
  printf 'fnox is required; run mise install before running this command.\n' >&2
  exit 1
fi

printf 'Initialize missing local demonstration secrets in pass? [y/N] '
read -r confirmation
if [ "$confirmation" != "y" ] && [ "$confirmation" != "Y" ]; then
  printf 'Secret initialization cancelled.\n'
  exit 0
fi

while IFS='|' read -r name value; do
  [ -n "$name" ] || continue
  fnox get "$name" >/dev/null 2>&1 || fnox set "$name" "$value" --provider pass
done <<'SECRETS'
SESSION_SECRET|a-very-strong-secret-with-more-than-32-char
DB_URL|postgresql://admin:admin@localhost:5432/dso-console-db?schema=public
KEYCLOAK_CLIENT_SECRET|client-secret-backend
KEYCLOAK_ADMIN|admin
KEYCLOAK_ADMIN_PASSWORD|admin
OPENCDS_API_TOKEN|token
SECRETS
