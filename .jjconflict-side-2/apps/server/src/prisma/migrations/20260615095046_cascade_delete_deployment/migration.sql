-- DropForeignKey
ALTER TABLE "Deployment" DROP CONSTRAINT "Deployment_environmentId_fkey";

-- DropForeignKey
ALTER TABLE "DeploymentSource" DROP CONSTRAINT "DeploymentSource_repositoryId_fkey";

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentSource" ADD CONSTRAINT "DeploymentSource_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
