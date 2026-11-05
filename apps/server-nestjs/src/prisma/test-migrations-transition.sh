#!/usr/bin/env bash
# E2E de transition des migrations de rôles : base legacy (avant la colonne
# type) → chaîne complète → head. Reproduit l'incident de doublons puis prouve
# la réparation. Autofinancé : conteneur postgres:16 jetable, seed et points de
# contrôle inlines. Usage : bash test-migrations-transition.sh (depuis n'importe
# où ; trouve le repo via son propre chemin).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
MG="$ROOT/apps/server-nestjs/src/prisma/migrations"
CUT=20260127164002_add_type_to_roles
DEDUP=20261020170010_dedup_legacy_system_roles
CONTAINER=cpn-transition-pg
[ -d "$MG/$DEDUP" ] || { echo "FAIL: $DEDUP absent de l'historique (stack sur fix/dedup-system-roles)"; exit 1; }

# docker socket : contexte par défaut, sinon socket Rancher Desktop
docker info >/dev/null 2>&1 || export DOCKER_HOST=unix://$HOME/.rd/docker.sock
docker info >/dev/null 2>&1 || { echo "FAIL: docker injoignable"; exit 1; }

WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
PSQL="docker exec -i $CONTAINER psql -q -v ON_ERROR_STOP=1 -U admin"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1; return 0; }
trap cleanup EXIT
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=dso-console-db postgres:16 >/dev/null
until docker exec "$CONTAINER" pg_isready -U admin >/dev/null 2>&1; do sleep 1; done

# Seed : projet legacy AU moment de la coupure (pas de colonne type ;
# Développeur 976, Sécurité 768@3, Lecture seule 768@4, everyonePerms 896).
cat > "$WORK/seed.sql" <<'EOF'
\set ON_ERROR_STOP on
INSERT INTO "User" ("id","email","firstName","lastName","createdAt","updatedAt","type")
VALUES ('22222222-2222-2222-2222-222222222222','dev@legacy.fr','Dev','Legacy',now(),now(),'human');
INSERT INTO "Project" ("id","name","status","createdAt","updatedAt","ownerId","slug",
  "hprodCpu","hprodGpu","hprodMemory","prodCpu","prodGpu","prodMemory","everyonePerms")
VALUES ('11111111-1111-1111-1111-111111111111','Legacy Chain Project','created',
  now(),now(),'22222222-2222-2222-2222-222222222222','legacy-chain',1,1,1,1,1,1,896);
INSERT INTO "ProjectRole" ("id","name","permissions","projectId","position","oidcGroup") VALUES
 ('aaaaaaaa-0000-0000-0000-000000000001','Administrateur',2 ,'11111111-1111-1111-1111-111111111111',0,'/legacy-chain/console/admin'),
 ('aaaaaaaa-0000-0000-0000-000000000002','DevOps',        984,'11111111-1111-1111-1111-111111111111',1,'/legacy-chain/console/devops'),
 ('aaaaaaaa-0000-0000-0000-000000000003','Développeur',   976,'11111111-1111-1111-1111-111111111111',2,'/legacy-chain/console/developer'),
 ('aaaaaaaa-0000-0000-0000-000000000004','Sécurité',      768,'11111111-1111-1111-1111-111111111111',3,'/legacy-chain/console/security'),
 ('aaaaaaaa-0000-0000-0000-000000000005','Lecture seule', 768,'11111111-1111-1111-1111-111111111111',4,'/legacy-chain/console/readonly');
INSERT INTO "ProjectMembers" ("projectId","userId","roleIds")
VALUES ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
  ARRAY['aaaaaaaa-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000004']::text[]);
EOF

# Points de contrôle après chaque migration de rupture.
cat > "$WORK/checkpoints.sql" <<'EOF'
SELECT 'ckpt_roles' AS k, string_agg(name||':'||type||':'||permissions||'@'||position, ',' ORDER BY position, name)
FROM "ProjectRole" WHERE "projectId"='11111111-1111-1111-1111-111111111111';
SELECT 'ckpt_dup_groups' AS k, count(*)::text FROM (
  SELECT 1 FROM "ProjectRole" WHERE "type"='system:managed'
  GROUP BY "projectId","name" HAVING count(*)>1) d;
SELECT 'ckpt_orphan_refs' AS k, count(*)::text FROM "ProjectMembers" pm
CROSS JOIN LATERAL unnest(pm."roleIds") r(rid)
LEFT JOIN "ProjectRole" pr ON pr."id"::text=r.rid WHERE pr."id" IS NULL;
SELECT 'ckpt_everyone_perms' AS k, "everyonePerms"::text FROM "Project"
WHERE "id"='11111111-1111-1111-1111-111111111111';
EOF
docker cp "$WORK/seed.sql" "$CONTAINER":/tmp/ >/dev/null
docker cp "$WORK/checkpoints.sql" "$CONTAINER":/tmp/ >/dev/null

echo "== replay pré-coupure (base legacy) =="
$PSQL -d postgres -c 'DROP DATABASE IF EXISTS "transition-db"' -c 'CREATE DATABASE "transition-db"' >/dev/null
for d in "$MG"/*/; do
  [ "$(basename "$d")" = "$CUT" ] && break
  $PSQL -1 -d transition-db < "$d/migration.sql" >/dev/null
done
$PSQL -d transition-db -f /tmp/seed.sql >/dev/null
echo "seed legacy OK (Dev 976, Sécurité 768@3, everyonePerms 896)"

echo "== replay de la coupure à head (-1 : une transaction par migration, comme prisma) =="
BREAKING=' 20260127164002_add_type_to_roles 20260226141201_role_type 20260330122500_migrate_project_system_roles_type_system_managed 20260907170000_backfill_project_roles 20260908155700_add_security_role 20261005155118_tighten_role_backfill 20261020170000_dedup_system_roles 20261019120000_drop_replay_hooks_from_everyone_perms '
started=
for d in "$MG"/*/; do
  name=$(basename "$d")
  [ -z "$started" ] && { [ "$name" = "$CUT" ] && started=1 || continue; }
  # le seed legacy est antérieur : ignorer les NOT NULL ajoutés après coupure
  $PSQL -1 -d transition-db < "$d/migration.sql" >/dev/null
  case "$BREAKING" in *" $name "*)
    echo "-- après $name :"
    docker exec "$CONTAINER" psql -U admin -d transition-db -t -A -f /tmp/checkpoints.sql | grep -v '^$' | sed 's/^/   /';;
  esac
done

echo "== assertions finales =="
fail=0
expect() { # expect <label> <attendu> <obtenu>
  if [ "$2" = "$3" ]; then echo "PASS $1=$3"; else echo "FAIL $1: attendu $2, obtenu $3"; fail=1; fi
}
FINAL_ROLES='Administrateur:system:managed:2@0,DevOps:system:managed:984@1,Développeur:system:managed:784@2,Lecture seule:system:managed:768@3,Sécurité:system:managed:832@4'
get() { docker exec "$CONTAINER" psql -U admin -d transition-db -t -A -c "$1"; }
expect roles_final "$FINAL_ROLES" "$(get "SELECT string_agg(name||':'||type||':'||permissions||'@'||position, ',' ORDER BY position, name) FROM \"ProjectRole\" WHERE \"projectId\"='11111111-1111-1111-1111-111111111111'")"
expect dup_groups 0 "$(get "SELECT count(*) FROM (SELECT 1 FROM \"ProjectRole\" WHERE \"type\"='system:managed' GROUP BY \"projectId\",name HAVING count(*)>1) d")"
expect orphan_refs 0 "$(get "SELECT count(*) FROM \"ProjectMembers\" pm CROSS JOIN LATERAL unnest(pm.\"roleIds\") r(rid) LEFT JOIN \"ProjectRole\" pr ON pr.\"id\"::text=r.rid WHERE pr.\"id\" IS NULL")"
# 896 attendu tant que la stack ne porte pas 20261019120000 (atterrie sur main
# après la divergence de la branche) ; 768 une fois rebasée dessus
if [ -d "$MG/20261019120000_drop_replay_hooks_from_everyone_perms" ]; then
  expect everyone_perms 768 "$(get "SELECT \"everyonePerms\" FROM \"Project\" WHERE id='11111111-1111-1111-1111-111111111111'")"
else
  expect everyone_perms 896 "$(get "SELECT \"everyonePerms\" FROM \"Project\" WHERE id='11111111-1111-1111-1111-111111111111'")"
fi
# l'index unique partiel rejette un doublon système frais
dup_rejected=$(docker exec "$CONTAINER" psql -U admin -d transition-db -t -A -c "INSERT INTO \"ProjectRole\" (\"id\",\"name\",\"permissions\",\"projectId\",\"position\",\"oidcGroup\",\"type\") VALUES (gen_random_uuid(),'Développeur',784,'11111111-1111-1111-1111-111111111111',2,'/legacy-chain/console/developer','system:managed')" 2>&1 | grep -c 'ProjectRole_system_name_key' || true)
expect index_rejette_doublon 1 "$dup_rejected"
# écart connu, documenté dans la PR : la Sécurité legacy reste type=managed
[ "$fail" = 0 ] && echo "== E2E TRANSITION : PASS ==" || { echo "== E2E TRANSITION : FAIL =="; exit 1; }
