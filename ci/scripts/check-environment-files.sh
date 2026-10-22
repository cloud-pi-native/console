#!/usr/bin/env bash

set -euo pipefail

unexpected="$(git ls-files | grep -E '(^|/)\.env[^/]*$' | grep -v '^apps/server/\.env' || true)"
if [ -n "$unexpected" ]; then
  printf 'Unexpected tracked environment files outside apps/server:\n%s\n' "$unexpected" >&2
  exit 1
fi

unexpected_loaders="$(grep -RInE 'getDotenvPaths|dotenv\.utils|loadEnvFile|envFilePath' \
  apps/server-nestjs/src apps/server-nestjs/test apps/client/vite.config.ts playwright/playwright.config.ts || true)"
if [ -n "$unexpected_loaders" ]; then
  printf 'Unexpected dotenv consumers outside apps/server:\n%s\n' "$unexpected_loaders" >&2
  exit 1
fi
