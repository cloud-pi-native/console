/*
  Warnings:

  - Made the column `externalUserName` on table `Repository` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
UPDATE "Repository" SET "externalUserName" = '' WHERE "externalUserName" IS NULL;

ALTER TABLE "Repository" ALTER COLUMN "externalUserName" SET NOT NULL,
ALTER COLUMN "externalUserName" SET DEFAULT '',
ALTER COLUMN "externalRepoUrl" SET DEFAULT '';
