#!/usr/bin/env bash

set -euo pipefail

project_dir="$(git rev-parse --show-toplevel)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
mkdir -p "$tmp_dir/bin"

cat > "$tmp_dir/bin/pass" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF

cat > "$tmp_dir/bin/fnox" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "get" ]; then
  exit 1
fi
printf '%s\n' "$*" >> "$FNOX_CALLS"
EOF

chmod +x "$tmp_dir/bin/pass" "$tmp_dir/bin/fnox"
export FNOX_CALLS="$tmp_dir/fnox.calls"
export PATH="$tmp_dir/bin:$PATH"
printf 'y\n' | "$project_dir/scripts/bootstrap-secrets.sh"

test "$(grep -c '^set ' "$tmp_dir/fnox.calls")" -eq 6
grep -Fqx 'set SESSION_SECRET a-very-strong-secret-with-more-than-32-char --provider pass' "$tmp_dir/fnox.calls"
grep -Fqx 'set OPENCDS_API_TOKEN token --provider pass' "$tmp_dir/fnox.calls"
