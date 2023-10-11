/*
  Warnings:

  - You are about to drop the `_ClusterToEnvironment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `clusterId` to the `Environment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuotaStageStatus" AS ENUM ('active', 'pendingDelete');

-- DropForeignKey
ALTER TABLE "_ClusterToEnvironment" DROP CONSTRAINT "_ClusterToEnvironment_A_fkey";

-- DropForeignKey
ALTER TABLE "_ClusterToEnvironment" DROP CONSTRAINT "_ClusterToEnvironment_B_fkey";

-- AlterTable
ALTER TABLE "Environment" ADD COLUMN     "clusterId" UUID NOT NULL,
ADD COLUMN     "environmentQuotaStageId" UUID;

-- DropTable
DROP TABLE "_ClusterToEnvironment";

-- CreateTable
CREATE TABLE "Quota" (
    "id" UUID NOT NULL,
    "memory" VARCHAR NOT NULL,
    "cpu" REAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" UUID NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotaStage" (
    "id" UUID NOT NULL,
    "quotaId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "status" "QuotaStageStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "QuotaStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentQuotaStage" (
    "id" UUID NOT NULL,
    "quotaStageId" UUID NOT NULL,

    CONSTRAINT "EnvironmentQuotaStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClusterToStage" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Quota_id_key" ON "Quota"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Quota_name_key" ON "Quota"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_id_key" ON "Stage"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_name_key" ON "Stage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "QuotaStage_id_key" ON "QuotaStage"("id");

-- CreateIndex
CREATE UNIQUE INDEX "QuotaStage_quotaId_stageId_key" ON "QuotaStage"("quotaId", "stageId");

-- CreateIndex
CREATE UNIQUE INDEX "EnvironmentQuotaStage_id_key" ON "EnvironmentQuotaStage"("id");

-- CreateIndex
CREATE UNIQUE INDEX "_ClusterToStage_AB_unique" ON "_ClusterToStage"("A", "B");

-- CreateIndex
CREATE INDEX "_ClusterToStage_B_index" ON "_ClusterToStage"("B");

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_environmentQuotaStageId_fkey" FOREIGN KEY ("environmentQuotaStageId") REFERENCES "EnvironmentQuotaStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaStage" ADD CONSTRAINT "QuotaStage_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaStage" ADD CONSTRAINT "QuotaStage_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentQuotaStage" ADD CONSTRAINT "EnvironmentQuotaStage_quotaStageId_fkey" FOREIGN KEY ("quotaStageId") REFERENCES "QuotaStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterToStage" ADD CONSTRAINT "_ClusterToStage_A_fkey" FOREIGN KEY ("A") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterToStage" ADD CONSTRAINT "_ClusterToStage_B_fkey" FOREIGN KEY ("B") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
