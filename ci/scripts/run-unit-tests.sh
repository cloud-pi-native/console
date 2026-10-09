#!/usr/bin/env bash

set -euo pipefail

for name in "${!NESTJS_@}"; do
  export "${name#NESTJS_}=${!name}"
done

exec fnox exec -- pnpm test:cov
