/*
  Warnings:

  - You are about to drop the `ProjectClusterHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP INDEX "ProjectClusterHistory_projectId_clusterId_key";
DROP TABLE "ProjectClusterHistory";
