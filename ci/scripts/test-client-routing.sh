#!/usr/bin/env bash
# Exercise the versioned client nginx config without an application stack.
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
tmp=$(mktemp -d)
container="cpn-client-routing-$$"
image=${NGINX_TEST_IMAGE:-$(awk '$1 == "FROM" && $NF == "prod" { print $2; exit }' "$root/apps/client/Dockerfile")}
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT
mkdir -p "$tmp/conf.d" "$tmp/html"
printf 'client SPA\n' > "$tmp/html/index.html"
cat > "$tmp/nginx.conf" <<'NGINX'
pid /tmp/nginx-routing.pid;
events {}
http {
    include /etc/nginx/mime.types;
    include /etc/nginx/conf.d/*.conf;
}
NGINX
python3 - "$root/apps/client/nginx/default.docker.conf" "$tmp/conf.d/client.conf" <<'PY'
import pathlib
import sys
source = pathlib.Path(sys.argv[1]).read_text()
source = source.replace('server-nestjs:3001', '127.0.0.1:8082')
source = source.replace('/etc/nginx/html', '/tmp/client-routing-html')
pathlib.Path(sys.argv[2]).write_text(source)
PY
cat > "$tmp/conf.d/witness.conf" <<'NGINX'
server {
    listen 8082;
    large_client_header_buffers 4 32k;
    add_header X-Test-Upstream nestjs always;
    add_header X-Test-Method $request_method always;
    add_header X-Test-URI $request_uri always;
    add_header X-Test-Host $host always;
    add_header X-Test-Real-IP $http_x_real_ip always;
    add_header X-Test-Forwarded-For $http_x_forwarded_for always;
    add_header X-Test-Forwarded-Proto $http_x_forwarded_proto always;
    add_header X-Test-Upgrade $http_upgrade always;
    add_header X-Test-Connection $http_connection always;
    location ~ ^/api/v1/(auth|version|healthz|health-services)$ { return 200; }
    location ~ ^/api/v2/projects/project-test/(environments|repositories)(/.*)?$ { return 200; }
    location /swagger-ui-server-nestjs { return 200; }
    location / { return 404; }
}
NGINX
chmod -R a+rX "$tmp"
mounts=(-v "$tmp/nginx.conf:/etc/nginx/nginx.conf:ro" -v "$tmp/conf.d:/etc/nginx/conf.d:ro" -v "$tmp/html:/tmp/client-routing-html:ro")
docker run --rm --user root --entrypoint nginx "${mounts[@]}" "$image" -t
docker run -d --name "$container" --user root --entrypoint nginx \
  -p 127.0.0.1::8080 "${mounts[@]}" "$image" -g 'daemon off;' >/dev/null
address=$(docker port "$container" 8080/tcp)
for _attempt in {1..50}; do
  if curl -fsS "http://$address/" >/dev/null 2>&1; then break; fi
  sleep 0.1
done

count=0
check() {
  local method=$1 request_path=$2 expected=$3 upstream=$4 status
  status=$(curl -sS -X "$method" -D "$tmp/headers" -o "$tmp/body" -w '%{http_code}' "http://$address$request_path")
  if [[ "$status" != "$expected" ]]; then
    echo "FAIL $method $request_path: expected HTTP $expected, got $status" >&2
    return 1
  fi
  if [[ "$upstream" == none ]]; then
    if grep -qi '^X-Test-Upstream:' "$tmp/headers"; then
      echo "FAIL $method $request_path: unexpected upstream" >&2
      return 1
    fi
  else
    grep -Fqi "X-Test-Upstream: $upstream" "$tmp/headers"
    grep -Fqi "X-Test-Method: $method" "$tmp/headers"
    grep -Fqi "X-Test-URI: $request_path" "$tmp/headers"
  fi
  count=$((count + 1))
  echo "PASS $method $request_path → $status ($upstream)"
}

for route in auth version healthz health-services; do
  check GET "/api/v1/$route" 200 nestjs
  check GET "/api/v1/$route/?probe=slash" 404 nestjs
done
for method in GET POST PUT PATCH DELETE OPTIONS; do
  check "$method" '/api?probe=empty' 404 none
done
for request_path in /api/ /api/v1/unknown /api/v1/unknown/ /api/v1/environments /api/v1/environments/item-test /api/v1/repositories /api/v1/repositories/item-test /api/v1/repositories/item-test/sync; do
  for method in GET POST PUT PATCH DELETE OPTIONS; do
    check "$method" "$request_path?probe=fallback" 404 nestjs
  done
done
for domain in environments repositories; do
  for method in GET POST PUT DELETE; do
    check "$method" "/api/v2/projects/project-test/$domain/item-test" 200 nestjs
  done
done
check POST /api/v2/projects/project-test/repositories/item-test/sync 200 nestjs
for request_path in /swagger-ui-server /swagger-ui-server/ /swagger-ui-server/json /swagger-ui-server-json /swagger-ui-unknown /apix; do
  check GET "$request_path" 404 none
done
for request_path in /swagger-ui-server-nestjs /swagger-ui-server-nestjs/ /swagger-ui-server-nestjs/swagger-ui.css /swagger-ui-server-nestjs-json; do
  check GET "$request_path" 200 nestjs
done
check GET /projects/client-route 200 none
grep -Fq 'client SPA' "$tmp/body"

curl -fsS -D "$tmp/headers" -o /dev/null \
  -H 'Host: console.test' -H 'Origin: https://console.test' \
  -H 'X-Forwarded-For: 203.0.113.7' -H 'Upgrade: websocket' -H 'Connection: upgrade' \
  "http://$address/api/v1/healthz"
for header in 'X-Test-Host: console.test' 'X-Test-Forwarded-Proto: http' 'X-Test-Upgrade: websocket' 'X-Test-Connection: upgrade' 'Access-Control-Allow-Origin: https://console.test'; do
  grep -Fqi "$header" "$tmp/headers"
done
grep -Eqi '^X-Test-Real-IP: [0-9.]+' "$tmp/headers"
grep -Eqi '^X-Test-Forwarded-For: 203\.0\.113\.7, [0-9.]+' "$tmp/headers"
count=$((count + 1))
large_header=$(printf '%12000s' '' | tr ' ' a)
curl -fsS -H "Authorization: Bearer $large_header" "http://$address/api/v1/healthz" >/dev/null
count=$((count + 1))
if grep -Eq 'nginx-strangler|server-legacy' "$root/apps/client/nginx/default.docker.conf"; then
  echo 'FAIL: client config still references the retired proxy or backend' >&2
  exit 1
fi
echo "$count client routing checks passed; NestJS is the only upstream."
