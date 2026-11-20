-- AlterTable
ALTER TABLE "Environment" ADD COLUMN "quotaStageId" UUID;
UPDATE "Environment"  SET "quotaStageId" = '8b3c201e-7518-4254-a94a-16c404e46936' WHERE "name" = 'dev';
UPDATE "Environment"  SET "quotaStageId" = '9157ae12-3e39-43f8-a24f-ae5d9c6b69b7' WHERE "name" = 'staging';
UPDATE "Environment"  SET "quotaStageId" = '4174b22c-2bee-4f4a-9d85-da7b5463f214' WHERE "name" = 'integration';
UPDATE "Environment"  SET "quotaStageId" = 'de0589b6-7cf5-4f1e-ab44-53e71a6cdb7a' WHERE "name" = 'prod';
ALTER TABLE "Environment" ALTER COLUMN "name" SET DATA TYPE VARCHAR(11);
ALTER TABLE "Environment" ALTER COLUMN "quotaStageId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_quotaStageId_fkey" FOREIGN KEY ("quotaStageId") REFERENCES "QuotaStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
