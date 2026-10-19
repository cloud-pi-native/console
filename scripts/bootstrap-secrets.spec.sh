#!/usr/bin/env bash

set -euo pipefail

project_dir="$(git rev-parse --show-toplevel)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
mkdir -p "$tmp_dir/bin" "$tmp_dir/project/scripts" "$tmp_dir/temporary-configs"
cp "$project_dir/scripts/bootstrap-secrets.sh" "$tmp_dir/project/scripts/"
cp "$project_dir/fnox.toml" "$tmp_dir/project/fnox.toml"
printf '\n# Preserve contributor edits too.\n' >> "$tmp_dir/project/fnox.toml"
cp "$tmp_dir/project/fnox.toml" "$tmp_dir/expected.toml"

cat > "$tmp_dir/bin/pass" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF

cat > "$tmp_dir/bin/fnox" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
config=fnox.toml
if [ "$1" = --config ]; then
  config="$2"
  shift 2
fi
if [ "$1" = get ]; then
  [ "${EXISTING_SECRETS:-false}" = true ]
  exit
fi
printf '%s\n' "$*" >> "$FNOX_CALLS"
[ "$1" = set ]
name="$2"
shift 2
# Simulate fnox rewriting the selected config, including when storage fails.
printf '\n# fnox rewrote config\n' >> "$config"
[ "$1" = --provider ] || { printf 'Secrets must not appear in argv\n' >&2; exit 1; }
[ "$2" = pass ]
value="$(</dev/stdin)"
printf '%s|%s\n' "$name" "$value" >> "$FNOX_VALUES"
exit "${FNOX_EXIT:-0}"
EOF

chmod +x "$tmp_dir/bin/"*
export FNOX_CALLS="$tmp_dir/fnox.calls"
export FNOX_VALUES="$tmp_dir/fnox.values"
export TMPDIR="$tmp_dir/temporary-configs"
export PATH="$tmp_dir/bin:$PATH"
cd "$tmp_dir/project"

printf 'y\n' | ./scripts/bootstrap-secrets.sh
cmp fnox.toml "$tmp_dir/expected.toml"
test "$(grep -c '^set ' "$FNOX_CALLS")" -eq 6
grep -Fqx 'set SESSION_SECRET --provider pass' "$FNOX_CALLS"
grep -Fqx 'SESSION_SECRET|a-very-strong-secret-with-more-than-32-char' "$FNOX_VALUES"
grep -Fqx 'OPENCDS_API_TOKEN|token' "$FNOX_VALUES"
test -z "$(ls -A "$TMPDIR")"

rm "$FNOX_CALLS"
printf 'y\n' | EXISTING_SECRETS=true ./scripts/bootstrap-secrets.sh
test ! -e "$FNOX_CALLS"
printf 'n\n' | ./scripts/bootstrap-secrets.sh
test ! -e "$FNOX_CALLS"

if printf 'y\n' | FNOX_EXIT=42 ./scripts/bootstrap-secrets.sh; then
  printf 'Bootstrap swallowed a provider failure\n' >&2
  exit 1
else
  test "$?" -eq 42
fi
cmp fnox.toml "$tmp_dir/expected.toml"
test -z "$(ls -A "$TMPDIR")"
printf 'Secret bootstrap regression tests passed.\n'
