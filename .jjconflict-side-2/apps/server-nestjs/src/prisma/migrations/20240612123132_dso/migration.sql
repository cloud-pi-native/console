-- CreateTable
CREATE TABLE "ProjectClusterHistory" (
    "projectId" UUID NOT NULL,
    "clusterId" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectClusterHistory_projectId_clusterId_key" ON "ProjectClusterHistory"("projectId", "clusterId");
