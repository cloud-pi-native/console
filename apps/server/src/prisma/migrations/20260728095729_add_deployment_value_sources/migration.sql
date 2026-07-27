-- CreateTable
CREATE TABLE "DeploymentInternalValueSource" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deploymentSourceId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "path" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DeploymentInternalValueSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentExternalValueSource" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deploymentSourceId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "path" TEXT NOT NULL DEFAULT '',
    "ref" TEXT NOT NULL,
    "targetRevision" TEXT NOT NULL DEFAULT '',
    "repositoryId" UUID NOT NULL,

    CONSTRAINT "DeploymentExternalValueSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentInternalValueSource_id_key" ON "DeploymentInternalValueSource"("id");

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentExternalValueSource_id_key" ON "DeploymentExternalValueSource"("id");

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentExternalValueSource_deploymentSourceId_key" ON "DeploymentExternalValueSource"("deploymentSourceId");

-- AddForeignKey
ALTER TABLE "DeploymentInternalValueSource" ADD CONSTRAINT "DeploymentInternalValueSource_deploymentSourceId_fkey" FOREIGN KEY ("deploymentSourceId") REFERENCES "DeploymentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentExternalValueSource" ADD CONSTRAINT "DeploymentExternalValueSource_deploymentSourceId_fkey" FOREIGN KEY ("deploymentSourceId") REFERENCES "DeploymentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentExternalValueSource" ADD CONSTRAINT "DeploymentExternalValueSource_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
