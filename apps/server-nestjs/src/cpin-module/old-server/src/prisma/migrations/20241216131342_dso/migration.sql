-- AlterTable
ALTER TABLE "_ClusterToProject" ADD CONSTRAINT "_ClusterToProject_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ClusterToProject_AB_unique";

-- AlterTable
ALTER TABLE "_ClusterToStage" ADD CONSTRAINT "_ClusterToStage_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ClusterToStage_AB_unique";

-- AlterTable
ALTER TABLE "_QuotaToStage" ADD CONSTRAINT "_QuotaToStage_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_QuotaToStage_AB_unique";
