/*
  Warnings:

  - You are about to alter the column `name` on the `Environment` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(11)`.
  - You are about to drop the `_ClusterToEnvironment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ClusterToEnvironment" DROP CONSTRAINT "_ClusterToEnvironment_A_fkey";

-- DropForeignKey
ALTER TABLE "_ClusterToEnvironment" DROP CONSTRAINT "_ClusterToEnvironment_B_fkey";

-- AlterTable
ALTER TABLE "Environment" ADD COLUMN     "clusterId" UUID,
ADD COLUMN     "quotaId" UUID,
ADD COLUMN     "stageId" UUID,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(11);

-- DropTable
DROP TABLE "_ClusterToEnvironment";

-- CreateTable
CREATE TABLE "Stage" (
    "id" UUID NOT NULL,
    "name" VARCHAR(11) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quota" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "compute" INTEGER NOT NULL,
    "memory" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_QuotaToStage" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "_ClusterToStage" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Stage_name_key" ON "Stage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Quota_name_key" ON "Quota"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_QuotaToStage_AB_unique" ON "_QuotaToStage"("A", "B");

-- CreateIndex
CREATE INDEX "_QuotaToStage_B_index" ON "_QuotaToStage"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ClusterToStage_AB_unique" ON "_ClusterToStage"("A", "B");

-- CreateIndex
CREATE INDEX "_ClusterToStage_B_index" ON "_ClusterToStage"("B");

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuotaToStage" ADD CONSTRAINT "_QuotaToStage_A_fkey" FOREIGN KEY ("A") REFERENCES "Quota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuotaToStage" ADD CONSTRAINT "_QuotaToStage_B_fkey" FOREIGN KEY ("B") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterToStage" ADD CONSTRAINT "_ClusterToStage_A_fkey" FOREIGN KEY ("A") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterToStage" ADD CONSTRAINT "_ClusterToStage_B_fkey" FOREIGN KEY ("B") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
