#!/usr/bin/env bash

set -euo pipefail

project_dir="$(git rev-parse --show-toplevel)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
mkdir -p "$tmp_dir/bin"

cat > "$tmp_dir/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$DOCKER_CALLS"
attempts="$(wc -l < "$DOCKER_CALLS")"
if [ "$attempts" -le "$DOCKER_FAILURES" ]; then
  exit 1
fi
EOF

cat > "$tmp_dir/bin/sleep" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$SLEEP_CALLS"
EOF

chmod +x "$tmp_dir/bin/docker" "$tmp_dir/bin/sleep"
export PATH="$tmp_dir/bin:$PATH"

run_manifest() {
  local failures="$1"
  export DOCKER_FAILURES="$failures"
  export DOCKER_CALLS="$tmp_dir/docker-$failures.calls"
  export SLEEP_CALLS="$tmp_dir/sleep-$failures.calls"

  "$project_dir/ci/scripts/create-image-manifest.sh" docker buildx imagetools create image:tag image@sha256:digest
}

run_manifest 3

test "$(wc -l < "$tmp_dir/docker-3.calls")" -eq 4
grep -Fqx '10' "$tmp_dir/sleep-3.calls"
grep -Fqx '60' "$tmp_dir/sleep-3.calls"
grep -Fqx '300' "$tmp_dir/sleep-3.calls"

if run_manifest 4; then
  printf 'Manifest creation unexpectedly succeeded after all retries.\n' >&2
  exit 1
fi

test "$(wc -l < "$tmp_dir/docker-4.calls")" -eq 4
test "$(wc -l < "$tmp_dir/sleep-4.calls")" -eq 3
