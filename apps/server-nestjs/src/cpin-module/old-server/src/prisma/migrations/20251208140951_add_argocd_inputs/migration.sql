-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "deployRevision" TEXT,
ADD COLUMN     "deployPath" TEXT,
ADD COLUMN     "helmValuesFiles" TEXT;
