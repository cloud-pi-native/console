-- CreateEnum
CREATE TYPE "ClusterPrivacy" AS ENUM ('public', 'dedicated');

-- CreateTable
CREATE TABLE "Cluster" (
    "id" UUID NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "privacy" "ClusterPrivacy" NOT NULL DEFAULT 'dedicated',
    "secretName" VARCHAR(50) NOT NULL,
    "clusterResources" BOOLEAN NOT NULL DEFAULT false,
    "kubeConfigId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kubeconfig" (
    "id" UUID NOT NULL,
    "user" JSONB NOT NULL,
    "cluster" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentClusterId" UUID,

    CONSTRAINT "Kubeconfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClusterToEnvironment" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "_ClusterToProject" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Cluster_id_key" ON "Cluster"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Cluster_label_key" ON "Cluster"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Cluster_secretName_key" ON "Cluster"("secretName");

-- CreateIndex
CREATE UNIQUE INDEX "Cluster_kubeConfigId_key" ON "Cluster"("kubeConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "Kubeconfig_id_key" ON "Kubeconfig"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Kubeconfig_parentClusterId_key" ON "Kubeconfig"("parentClusterId");

-- CreateIndex
CREATE UNIQUE INDEX "_ClusterToEnvironment_AB_unique" ON "_ClusterToEnvironment"("A", "B");

-- CreateIndex
CREATE INDEX "_ClusterToEnvironment_B_index" ON "_ClusterToEnvironment"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ClusterToProject_AB_unique" ON "_ClusterToProject"("A", "B");

-- CreateIndex
CREATE INDEX "_ClusterToProject_B_index" ON "_ClusterToProject"("B");

-- AddForeignKey
ALTER TABLE "Cluster" ADD CONSTRAINT "Cluster_kubeConfigId_fkey" FOREIGN KEY ("kubeConfigId") REFERENCES "Kubeconfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterToEnvironment" ADD CONSTRAINT "_ClusterToEnvironment_A_fkey" FOREIGN KEY ("A") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterToEnvironment" ADD CONSTRAINT "_ClusterToEnvironment_B_fkey" FOREIGN KEY ("B") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterToProject" ADD CONSTRAINT "_ClusterToProject_A_fkey" FOREIGN KEY ("A") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterToProject" ADD CONSTRAINT "_ClusterToProject_B_fkey" FOREIGN KEY ("B") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
