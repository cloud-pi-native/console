#!/usr/bin/env bash
# Reverts migration 20261116120000_share_deployment_external_values_ref, to run before
# redeploying a server image older than that migration.
#
# Usage:
#   DB_URL=postgresql://user:pass@host:5432/db ./scripts/rollback-share-deployment-external-values-ref.sh
#   ./scripts/rollback-share-deployment-external-values-ref.sh   # local docker compose database
#     (override with CONTAINER, DB_USER and DB_NAME)
set -euo pipefail

MIGRATION="20261116120000_share_deployment_external_values_ref"

if [[ -n "${DB_URL:-}" ]]; then
  PSQL=(psql "${DB_URL}" -v ON_ERROR_STOP=1)
  TARGET="${DB_URL%%\?*}"
  TARGET="${TARGET##*@}"
else
  CONTAINER="${CONTAINER:-dso-console_postgres}"
  DB_USER="${DB_USER:-admin}"
  DB_NAME="${DB_NAME:-dso-console-db}"
  PSQL=(docker exec -i "${CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1)
  TARGET="${DB_NAME} (container ${CONTAINER})"
fi

echo "Rolling back ${MIGRATION} on ${TARGET}"

"${PSQL[@]}" <<'SQL'
BEGIN;

DO $$
DECLARE
  dropped_refs TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20261116120000_share_deployment_external_values_ref') THEN
    RAISE EXCEPTION 'Migration 20261116120000_share_deployment_external_values_ref is not applied, nothing to roll back';
  END IF;

  -- The previous schema allows a single external value file per deployment source,
  -- so refuse instead of silently dropping files.
  IF EXISTS (SELECT 1 FROM "DeploymentExternalValueSource" GROUP BY "externalValuesRefId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Some external refs own several value files, which the previous schema cannot store. Keep one file per ref, then retry.';
  END IF;

  SELECT string_agg("deploymentSourceId"::TEXT, ', ') INTO dropped_refs
  FROM "DeploymentExternalValuesRef" AS "valuesRef"
  WHERE NOT EXISTS (SELECT 1 FROM "DeploymentExternalValueSource" WHERE "externalValuesRefId" = "valuesRef"."id");
  IF dropped_refs IS NOT NULL THEN
    RAISE NOTICE 'Dropping external refs without value files (deployment sources: %)', dropped_refs;
  END IF;
END $$;

ALTER TABLE "DeploymentExternalValueSource"
  ADD COLUMN "deploymentSourceId" UUID,
  ADD COLUMN "ref" TEXT,
  ADD COLUMN "targetRevision" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "repositoryId" UUID;

UPDATE "DeploymentExternalValueSource" AS "valueSource"
SET "deploymentSourceId" = "valuesRef"."deploymentSourceId",
    "ref" = "valuesRef"."ref",
    "targetRevision" = "valuesRef"."targetRevision",
    "repositoryId" = "valuesRef"."repositoryId"
FROM "DeploymentExternalValuesRef" AS "valuesRef"
WHERE "valuesRef"."id" = "valueSource"."externalValuesRefId";

ALTER TABLE "DeploymentExternalValueSource"
  ALTER COLUMN "deploymentSourceId" SET NOT NULL,
  ALTER COLUMN "ref" SET NOT NULL,
  ALTER COLUMN "repositoryId" SET NOT NULL;

ALTER TABLE "DeploymentExternalValueSource" DROP CONSTRAINT "DeploymentExternalValueSource_externalValuesRefId_fkey";
DROP INDEX "DeploymentExternalValueSource_externalValuesRefId_idx";
ALTER TABLE "DeploymentExternalValueSource" DROP COLUMN "externalValuesRefId";

CREATE UNIQUE INDEX "DeploymentExternalValueSource_deploymentSourceId_key" ON "DeploymentExternalValueSource"("deploymentSourceId");
ALTER TABLE "DeploymentExternalValueSource" ADD CONSTRAINT "DeploymentExternalValueSource_deploymentSourceId_fkey" FOREIGN KEY ("deploymentSourceId") REFERENCES "DeploymentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeploymentExternalValueSource" ADD CONSTRAINT "DeploymentExternalValueSource_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "DeploymentExternalValuesRef";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261116120000_share_deployment_external_values_ref';

COMMIT;
SQL

echo "Done. Deploy the previous server image, or regenerate the Prisma client locally (pnpm --dir apps/backend db:generate)."
