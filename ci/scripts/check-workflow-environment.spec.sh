#!/usr/bin/env bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

workflow=.github/workflows/job-playwright.yml
if grep -n 'docker compose' "$workflow" | grep -v 'name:' | grep -vF 'mise -E ci exec -- fnox exec -- docker compose'; then
  printf 'Every Playwright Compose command must resolve CI configuration and secrets.\n' >&2
  exit 1
fi
test "$(grep -cF 'mise -E ci exec -- fnox exec -- docker compose' "$workflow")" -eq 4
grep -A 2 'name: Clean up docker resources' "$workflow" | grep -Fq "if: \${{ always() }}"
if grep -Rn 'NODE_VERSION' .github/workflows; then
  printf 'Node must be pinned only by mise, not by unused workflow inputs.\n' >&2
  exit 1
fi
printf 'Workflow environment regression tests passed.\n'
