#!/usr/bin/env bash
# Real nginx routing regression tests; no application stack or fixtures required.
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
tmp=$(mktemp -d)
container="cpn-strangler-routing-$$"
image=${NGINX_TEST_IMAGE:-$(awk '$1 == "FROM" { print $2; exit }' "$root/apps/nginx-strangler/Dockerfile")}
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT
chmod 755 "$tmp"
cp "$root/apps/nginx-strangler/nginx.conf" "$tmp/nginx.conf"
mkdir "$tmp/conf.d"
# Substitute only upstream addresses; exercise the actual versioned locations.
python3 - "$root/apps/nginx-strangler/conf.d/routing.conf" "$tmp/conf.d/routing.conf" <<'PY'
import pathlib
import sys
source = pathlib.Path(sys.argv[1]).read_text()
pathlib.Path(sys.argv[2]).write_text(source.replace('${LEGACY_UPSTREAM}', '127.0.0.1:8081').replace('${NESTJS_UPSTREAM}', '127.0.0.1:8082'))
PY
cat > "$tmp/conf.d/witnesses.conf" <<'NGINX'
server {
    listen 8081;
    access_log /var/log/nginx/legacy-test.log main;
    add_header X-Test-Upstream legacy always;
    return 418;
}
server {
    listen 8082;
    add_header X-Test-Upstream nestjs always;
    add_header X-Test-Method $request_method always;
    add_header X-Test-URI $request_uri always;
    location ~ ^/api/v1/(auth|version|healthz|health-services)$ { return 200; }
    location ~ ^/api/v2/projects/project-test/(environments|repositories)(/.*)?$ { return 200; }
    location /swagger-ui-server-nestjs { return 200; }
    location / { return 404; }
}
NGINX
chmod -R a+rX "$tmp"
docker run --rm --user root --entrypoint nginx \
  -v "$tmp/nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "$tmp/conf.d:/etc/nginx/conf.d:ro" "$image" -t

docker run -d --name "$container" --user root --entrypoint nginx \
  -p 127.0.0.1::8080 \
  -v "$tmp/nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "$tmp/conf.d:/etc/nginx/conf.d:ro" "$image" -g 'daemon off;' >/dev/null
address=$(docker port "$container" 8080/tcp)
for _attempt in {1..50}; do
  if curl -fsS "http://$address/health" >/dev/null 2>&1; then break; fi
  sleep 0.1
done

count=0
check() {
  local method=$1 path=$2 expected=$3 upstream=$4 status
  status=$(curl -sS -X "$method" -D "$tmp/headers" -o "$tmp/body" -w '%{http_code}' "http://$address$path")
  if [[ "$status" != "$expected" ]]; then
    echo "FAIL $method $path: expected HTTP $expected, got $status" >&2
    return 1
  fi
  if [[ "$upstream" == none ]]; then
    if grep -qi '^X-Test-Upstream:' "$tmp/headers"; then
      echo "FAIL $method $path: unexpected upstream" >&2
      return 1
    fi
  else
    grep -Fqi "X-Test-Upstream: $upstream" "$tmp/headers"
    grep -Fqi "X-Test-Method: $method" "$tmp/headers"
    grep -Fqi "X-Test-URI: $path" "$tmp/headers"
  fi
  count=$((count + 1))
  echo "PASS $method $path → $status ($upstream)"
}

for route in auth version healthz health-services; do
  check GET "/api/v1/$route" 200 nestjs
  check GET "/api/v1/$route/?probe=slash" 404 nestjs
done
for method in GET POST PUT PATCH DELETE OPTIONS; do
  check "$method" '/api?probe=empty' 404 none
done
for path in /api/ /api/v1/unknown /api/v1/unknown/ /api/v1/environments /api/v1/environments/item-test /api/v1/repositories /api/v1/repositories/item-test /api/v1/repositories/item-test/sync; do
  for method in GET POST PUT PATCH DELETE OPTIONS; do
    check "$method" "$path?probe=fallback" 404 nestjs
  done
done
for domain in environments repositories; do
  check GET "/api/v2/projects/project-test/$domain" 200 nestjs
  check POST "/api/v2/projects/project-test/$domain" 200 nestjs
  check PUT "/api/v2/projects/project-test/$domain/item-test" 200 nestjs
  check DELETE "/api/v2/projects/project-test/$domain/item-test" 200 nestjs
done
check POST /api/v2/projects/project-test/repositories/item-test/sync 200 nestjs
for path in /swagger-ui-server /swagger-ui-server/ /swagger-ui-server/json /swagger-ui-server-json; do
  check GET "$path" 404 none
done
for path in /swagger-ui-server-nestjs /swagger-ui-server-nestjs/ /swagger-ui-server-nestjs/swagger-ui.css /swagger-ui-server-nestjs-json; do
  check GET "$path" 200 nestjs
done
check GET /health 200 none
if grep -Eq 'proxy_pass[[:space:]]+http://server-legacy' "$tmp/conf.d/routing.conf"; then
  echo 'FAIL: a location still targets the legacy upstream' >&2
  exit 1
fi
if docker exec "$container" test -s /var/log/nginx/legacy-test.log; then
  echo 'FAIL: legacy upstream received requests' >&2
  exit 1
fi
echo "$count routing checks passed; no legacy upstream requests."
