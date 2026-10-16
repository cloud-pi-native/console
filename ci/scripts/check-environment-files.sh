#!/usr/bin/env bash

set -euo pipefail

unexpected="$(git ls-files | grep -E '(^|/)\.env[^/]*$' | grep -v '^apps/server/\.env' || true)"
if [ -n "$unexpected" ]; then
  printf 'Unexpected tracked environment files outside apps/server:\n%s\n' "$unexpected" >&2
  exit 1
fi
