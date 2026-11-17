-- CreateTable
CREATE TABLE "DeploymentExternalValuesRef" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deploymentSourceId" UUID NOT NULL,
    "ref" TEXT NOT NULL,
    "targetRevision" TEXT NOT NULL DEFAULT '',
    "repositoryId" UUID NOT NULL,

    CONSTRAINT "DeploymentExternalValuesRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentExternalValuesRef_id_key" ON "DeploymentExternalValuesRef"("id");

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentExternalValuesRef_deploymentSourceId_key" ON "DeploymentExternalValuesRef"("deploymentSourceId");

-- AddForeignKey
ALTER TABLE "DeploymentExternalValuesRef" ADD CONSTRAINT "DeploymentExternalValuesRef_deploymentSourceId_fkey" FOREIGN KEY ("deploymentSourceId") REFERENCES "DeploymentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentExternalValuesRef" ADD CONSTRAINT "DeploymentExternalValuesRef_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MigrateData
-- The former unique index guaranteed at most one external value source per
-- deployment source, so each one maps to exactly one shared ref.
INSERT INTO "DeploymentExternalValuesRef" ("id", "createdAt", "updatedAt", "deploymentSourceId", "ref", "targetRevision", "repositoryId")
SELECT gen_random_uuid(), "createdAt", "updatedAt", "deploymentSourceId", "ref", "targetRevision", "repositoryId"
FROM "DeploymentExternalValueSource";

-- AlterTable
ALTER TABLE "DeploymentExternalValueSource" ADD COLUMN "externalValuesRefId" UUID;

-- MigrateData
UPDATE "DeploymentExternalValueSource" AS "valueSource"
SET "externalValuesRefId" = "valuesRef"."id"
FROM "DeploymentExternalValuesRef" AS "valuesRef"
WHERE "valuesRef"."deploymentSourceId" = "valueSource"."deploymentSourceId";

-- AlterTable
ALTER TABLE "DeploymentExternalValueSource" ALTER COLUMN "externalValuesRefId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "DeploymentExternalValueSource" DROP CONSTRAINT "DeploymentExternalValueSource_deploymentSourceId_fkey";

-- DropForeignKey
ALTER TABLE "DeploymentExternalValueSource" DROP CONSTRAINT "DeploymentExternalValueSource_repositoryId_fkey";

-- DropIndex
DROP INDEX "DeploymentExternalValueSource_deploymentSourceId_key";

-- AlterTable
ALTER TABLE "DeploymentExternalValueSource" DROP COLUMN "deploymentSourceId",
DROP COLUMN "ref",
DROP COLUMN "targetRevision",
DROP COLUMN "repositoryId";

-- CreateIndex
CREATE INDEX "DeploymentExternalValueSource_externalValuesRefId_idx" ON "DeploymentExternalValueSource"("externalValuesRefId");

-- AddForeignKey
ALTER TABLE "DeploymentExternalValueSource" ADD CONSTRAINT "DeploymentExternalValueSource_externalValuesRefId_fkey" FOREIGN KEY ("externalValuesRefId") REFERENCES "DeploymentExternalValuesRef"("id") ON DELETE CASCADE ON UPDATE CASCADE;
