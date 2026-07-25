-- AlterTable
ALTER TABLE "Environment" ADD COLUMN     "quotaId" UUID,
ADD COLUMN     "stageId" UUID;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "_QuotaToStage" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_QuotaToStage_AB_unique" ON "_QuotaToStage"("A", "B");

-- CreateIndex
CREATE INDEX "_QuotaToStage_B_index" ON "_QuotaToStage"("B");

-- AddForeignKey
ALTER TABLE "_QuotaToStage" ADD CONSTRAINT "_QuotaToStage_A_fkey" FOREIGN KEY ("A") REFERENCES "Quota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuotaToStage" ADD CONSTRAINT "_QuotaToStage_B_fkey" FOREIGN KEY ("B") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
DECLARE
    quota_stage_row RECORD;
BEGIN
    FOR quota_stage_row IN SELECT * FROM public."QuotaStage" loop
        UPDATE public."Environment" SET "stageId" = quota_stage_row."stageId" WHERE "Environment"."quotaStageId" = quota_stage_row.id;
        UPDATE public."Environment" SET "quotaId" = quota_stage_row."quotaId" WHERE "Environment"."quotaStageId" = quota_stage_row.id;
        insert into public."_QuotaToStage" values (quota_stage_row."quotaId", quota_stage_row."stageId");
    END LOOP;
END $$;

-- DropForeignKey
ALTER TABLE "Environment" DROP CONSTRAINT "Environment_quotaStageId_fkey";

-- AlterTable
ALTER TABLE "Environment" ALTER COLUMN "quotaId" SET NOT NULL,
ALTER COLUMN "stageId" SET NOT NULL,
DROP COLUMN "quotaStageId";

-- DropForeignKey
ALTER TABLE "QuotaStage" DROP CONSTRAINT "QuotaStage_quotaId_fkey";

-- DropForeignKey
ALTER TABLE "QuotaStage" DROP CONSTRAINT "QuotaStage_stageId_fkey";

-- DropTable
DROP TABLE "QuotaStage";

-- DropEnum
DROP TYPE "QuotaStageStatus";
