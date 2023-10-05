-- AlterTable
ALTER TABLE "Environment" ADD COLUMN     "quotaId" UUID;

-- CreateTable
CREATE TABLE "Quota" (
    "id" UUID NOT NULL,
    "flavor" TEXT NOT NULL,
    "allowedEnvs" TEXT[],
    "compute" TEXT NOT NULL DEFAULT '2vcpu / 4Gb ram',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quota_flavor_key" ON "Quota"("flavor");

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota"("id") ON DELETE SET NULL ON UPDATE CASCADE;
