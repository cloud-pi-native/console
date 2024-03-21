/*
  Warnings:

  - You are about to drop the column `status` on the `Environment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Repository` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Environment" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "Repository" DROP COLUMN "status";
