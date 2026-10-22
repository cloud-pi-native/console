#!/usr/bin/env bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Use demonstration CI secrets even for dev/integ to avoid reading local pass entries.
for profile in docker ci integ; do
  compose_profile="$profile"
  [ "$profile" != docker ] || compose_profile=dev
  KUBECONFIG_HOST_PATH=/tmp/console-test-kubeconfig EXTERNAL_PLUGINS_DIR_HOST_PATH=/tmp/console-test-plugins \
    mise -E "$profile" exec -- fnox -P ci exec -- \
    docker compose -f "docker/docker-compose.$compose_profile.yml" config --format json |
    node --input-type=module -e '
      import assert from "node:assert/strict"
      let input = ""
      for await (const chunk of process.stdin) input += chunk
      const environment = JSON.parse(input).services["server-nestjs"].environment
      for (const plugin of ["ARGOCD", "GITLAB", "HARBOR", "NEXUS", "OBSERVABILITY", "SONARQUBE", "VAULT"]) {
        assert.equal(environment["USE_" + plugin], "false", "USE_" + plugin + " must be explicitly disabled")
      }
      assert.equal(environment.USE_SERVICE_CHAIN, process.argv[1] === "integ" ? "false" : "true")
      if (process.argv[1] === "ci") {
        assert.equal(environment.NODE_ENV, "production")
        assert.equal(environment.KEYCLOAK_DOMAIN, "keycloak:8080")
        assert.equal(new URL(environment.DB_URL).hostname, "postgres")
        assert.equal(JSON.parse(input).services.client.environment.SERVER_HOST, "nginx-strangler")
      }
    ' "$profile"
done
printf 'Compose plugin environment regression tests passed.\n'
