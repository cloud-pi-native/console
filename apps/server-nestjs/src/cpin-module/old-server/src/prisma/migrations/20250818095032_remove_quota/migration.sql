-- AlterTable
ALTER TABLE "Environment" 
ADD COLUMN "cpu" REAL NOT NULL DEFAULT 0,
ADD COLUMN "gpu" REAL NOT NULL DEFAULT 0,
ADD COLUMN "memory" REAL NOT NULL DEFAULT 0;

COMMENT ON COLUMN "Environment".cpu IS 'CPU share as float (1 and 0.01 are valid values)';
COMMENT ON COLUMN "Environment".gpu IS 'GPU share as float (1 and 0.01 are valid values)';
COMMENT ON COLUMN "Environment".memory IS 'Memory value as GigaBytes (1 and 0.01 are valid values)';

-- Use values from Quota. Memory is an extract of q.memory numeric value as it contains a unit (e.g. '2Gi').
UPDATE "Environment"
SET cpu = q.cpu, memory = COALESCE(NULLIF(regexp_replace(q.memory, '\D', '','g'), ''), '0')::numeric 
FROM "Quota" q
WHERE "quotaId" = q."id";

/*
  Warnings:

  - You are about to drop the column `quotaId` on the `Environment` table. All the data in the column will be lost.
  - You are about to drop the `Quota` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_QuotaToStage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Environment" DROP CONSTRAINT "Environment_quotaId_fkey";

-- DropForeignKey
ALTER TABLE "_QuotaToStage" DROP CONSTRAINT "_QuotaToStage_A_fkey";

-- DropForeignKey
ALTER TABLE "_QuotaToStage" DROP CONSTRAINT "_QuotaToStage_B_fkey";

-- AlterTable
ALTER TABLE "Environment" DROP COLUMN "quotaId",
ALTER COLUMN "cpu" DROP DEFAULT,
ALTER COLUMN "gpu" DROP DEFAULT,
ALTER COLUMN "memory" DROP DEFAULT;

-- DropTable
DROP TABLE "Quota";

-- DropTable
DROP TABLE "_QuotaToStage";
