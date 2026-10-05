#!/usr/bin/env bash

set -euo pipefail

retry_delays=(10 60 300)

for delay in "${retry_delays[@]}"; do
  if "$@"; then
    exit 0
  fi

  printf 'Image manifest creation failed; retrying in %s seconds.\n' "$delay" >&2
  sleep "$delay"
done

exec "$@"
