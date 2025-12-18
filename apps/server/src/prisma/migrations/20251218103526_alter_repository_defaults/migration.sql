-- Eliminate NULLs
UPDATE "Repository" SET "deployRevision" = '' WHERE "deployRevision" IS NULL;
UPDATE "Repository" SET "deployPath" = '' WHERE "deployPath" IS NULL;
UPDATE "Repository" SET "helmValuesFiles" = '' WHERE "helmValuesFiles" IS NULL;

-- AlterTable
ALTER TABLE "Repository" ALTER COLUMN "deployRevision" SET NOT NULL,
ALTER COLUMN "deployRevision" SET DEFAULT '',
ALTER COLUMN "deployPath" SET NOT NULL,
ALTER COLUMN "deployPath" SET DEFAULT '',
ALTER COLUMN "helmValuesFiles" SET NOT NULL,
ALTER COLUMN "helmValuesFiles" SET DEFAULT '';
