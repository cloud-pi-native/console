/*
  Warnings:

  - You are about to drop the column `name` on the `Environment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Environment" DROP COLUMN "name",
ADD COLUMN     "dsoEnvironmentId" UUID,
ADD COLUMN     "quotaId" UUID;

-- CreateTable
CREATE TABLE "DsoEnvironment" (
    "id" UUID NOT NULL,
    "name" VARCHAR(11) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DsoEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quota" (
    "id" UUID NOT NULL,
    "flavor" TEXT NOT NULL,
    "allowedEnvIds" TEXT[],
    "compute" TEXT NOT NULL DEFAULT '2vcpu / 4Gb ram',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DsoEnvironment_name_key" ON "DsoEnvironment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Quota_flavor_key" ON "Quota"("flavor");

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_dsoEnvironmentId_fkey" FOREIGN KEY ("dsoEnvironmentId") REFERENCES "DsoEnvironment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
