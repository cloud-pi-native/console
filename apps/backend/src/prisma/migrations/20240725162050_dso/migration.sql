-- DropIndex
DROP INDEX "AdminRole_name_key";

-- AlterTable
ALTER TABLE "AdminRole" ADD COLUMN     "oidcGroup" TEXT;
