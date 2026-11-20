/*
  Warnings:

  - Made the column `oidcGroup` on table `AdminRole` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable

UPDATE public."AdminRole"
SET "oidcGroup"=''
WHERE "oidcGroup" IS NULL;

ALTER TABLE "AdminRole" ALTER COLUMN "oidcGroup" SET NOT NULL,
ALTER COLUMN "oidcGroup" SET DEFAULT '';
