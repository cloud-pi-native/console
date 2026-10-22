#!/usr/bin/env bash

set -euo pipefail

project_dir="$(git rev-parse --show-toplevel)"
cd "$project_dir"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
mkdir -p "$tmp_dir/bin"

cat > "$tmp_dir/bin/fnox" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
[ "$1" != -P ] || shift 2
[ "$1" = exec ]
shift
[ "$1" = -- ] && shift
exec "$@"
EOF

cat > "$tmp_dir/bin/pnpm" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" > "$PNPM_CALL"
env > "$PNPM_ENV"
exit "${PNPM_EXIT:-0}"
EOF
chmod +x "$tmp_dir/bin/"*

for task in server-nestjs:dev server-nestjs:test-inner test:unit playwright:test; do
  command="$(mise tasks info "$task" --json | node --input-type=module -e '
    let input = ""
    for await (const chunk of process.stdin) input += chunk
    process.stdout.write(JSON.parse(input).run.join("\n"))
  ')"
  env -i PATH="$tmp_dir/bin:$PATH" HOME="$HOME" PNPM_CALL="$tmp_dir/call" PNPM_ENV="$tmp_dir/env" \
    NESTJS_SERVER_HOST=localhost NESTJS_SERVER_PORT=3001 \
    NESTJS_KEYCLOAK_PROTOCOL=http NESTJS_KEYCLOAK_DOMAIN=localhost:8090 \
    NESTJS_KEYCLOAK_REALM=dso NESTJS_KEYCLOAK_CLIENT_ID=backend \
    NESTJS_KEYCLOAK_REDIRECT_URI=http://localhost:8080 NESTJS_CONTACT_EMAIL=demo@example.com \
    NESTJS_USE_VAULT=false NESTJS_USE_GITLAB=false NESTJS_PROJECTS_ROOT_DIR='' \
    NESTJS_FUTURE_PUBLIC_VALUE='value with spaces' \
    CLIENT_KEYCLOAK_PROTOCOL=https CLIENT_KEYCLOAK_DOMAIN=browser.example.com \
    CLIENT_KEYCLOAK_REALM=browser-realm CLIENT_KEYCLOAK_REDIRECT_URI=https://console.example.com \
    bash -c "$command"
  if [ "$task" = playwright:test ]; then
    grep -Fqx 'KEYCLOAK_PROTOCOL=https' "$tmp_dir/env"
    grep -Fqx 'KEYCLOAK_DOMAIN=browser.example.com' "$tmp_dir/env"
    grep -Fqx 'KEYCLOAK_REALM=browser-realm' "$tmp_dir/env"
    grep -Fqx 'KEYCLOAK_REDIRECT_URI=https://console.example.com' "$tmp_dir/env"
  else
    grep -Fqx 'USE_VAULT=false' "$tmp_dir/env"
    grep -Fqx 'USE_GITLAB=false' "$tmp_dir/env"
    grep -Fqx 'PROJECTS_ROOT_DIR=' "$tmp_dir/env"
    grep -Fqx 'FUTURE_PUBLIC_VALUE=value with spaces' "$tmp_dir/env"
  fi
  case "$task" in
    server-nestjs:dev) grep -Fqx -- '--filter server-nestjs run start:dev' "$tmp_dir/call" ;;
    server-nestjs:test-inner)
      grep -Fqx -- '--filter server-nestjs test' "$tmp_dir/call"
      grep -Fqx 'NODE_ENV=test' "$tmp_dir/env"
      ;;
    test:unit) grep -Fqx 'test:cov' "$tmp_dir/call" ;;
    playwright:test) grep -Fqx -- '--dir playwright exec playwright test --grep @e2e' "$tmp_dir/call" ;;
  esac
  if env PATH="$tmp_dir/bin:$PATH" PNPM_CALL="$tmp_dir/call" PNPM_ENV="$tmp_dir/env" PNPM_EXIT=42 bash -c "$command"; then
    printf 'Task %s swallowed the child failure\n' "$task" >&2
    exit 1
  else
    test "$?" -eq 42
  fi
done
printf 'Application task environment regression tests passed.\n'
