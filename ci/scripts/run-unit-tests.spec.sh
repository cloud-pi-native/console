#!/usr/bin/env bash

set -euo pipefail

project_dir="$(git rev-parse --show-toplevel)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
mkdir -p "$tmp_dir/bin"

cat > "$tmp_dir/bin/fnox" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
[ "$1" = "exec" ]
shift
exec "$@"
EOF

cat > "$tmp_dir/bin/pnpm" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" > "$PNPM_CALL"
env | sort > "$PNPM_ENV"
EOF

chmod +x "$tmp_dir/bin/fnox" "$tmp_dir/bin/pnpm"
export PATH="$tmp_dir/bin:$PATH"
export PNPM_CALL="$tmp_dir/pnpm.call"
export PNPM_ENV="$tmp_dir/pnpm.env"

unset KEYCLOAK_PROTOCOL KEYCLOAK_DOMAIN KEYCLOAK_REALM KEYCLOAK_CLIENT_ID KEYCLOAK_REDIRECT_URI CONTACT_EMAIL || true
export NESTJS_SERVER_HOST='0.0.0.0'
export NESTJS_SERVER_PORT='3001'
export NESTJS_KEYCLOAK_PROTOCOL='http'
export NESTJS_KEYCLOAK_DOMAIN='keycloak:8080'
export NESTJS_KEYCLOAK_REALM='dso'
export NESTJS_KEYCLOAK_CLIENT_ID='dso-console-backend'
export NESTJS_KEYCLOAK_REDIRECT_URI='http://localhost:8080'
export NESTJS_CONTACT_EMAIL='cloudpinative-relations@interieur.gouv.fr'
export NESTJS_GRAFANA_URL='https://grafana.example.com'
export NESTJS_DSO_OBSERVABILITY_CHART_VERSION='dso-observability-0.1.7'
export NESTJS_FUTURE_PUBLIC_VALUE='available'

"$project_dir/ci/scripts/run-unit-tests.sh"

grep -Fqx 'test:cov' "$PNPM_CALL"
grep -Fqx 'SERVER_HOST=0.0.0.0' "$PNPM_ENV"
grep -Fqx 'SERVER_PORT=3001' "$PNPM_ENV"
grep -Fqx 'KEYCLOAK_PROTOCOL=http' "$PNPM_ENV"
grep -Fqx 'KEYCLOAK_DOMAIN=keycloak:8080' "$PNPM_ENV"
grep -Fqx 'KEYCLOAK_REALM=dso' "$PNPM_ENV"
grep -Fqx 'KEYCLOAK_CLIENT_ID=dso-console-backend' "$PNPM_ENV"
grep -Fqx 'KEYCLOAK_REDIRECT_URI=http://localhost:8080' "$PNPM_ENV"
grep -Fqx 'CONTACT_EMAIL=cloudpinative-relations@interieur.gouv.fr' "$PNPM_ENV"
grep -Fqx 'GRAFANA_URL=https://grafana.example.com' "$PNPM_ENV"
grep -Fqx 'DSO_OBSERVABILITY_CHART_VERSION=dso-observability-0.1.7' "$PNPM_ENV"
grep -Fqx 'FUTURE_PUBLIC_VALUE=available' "$PNPM_ENV"
