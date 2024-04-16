/*
  Warnings:

  - Added the required column `type` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RepositorySource" AS ENUM ('clone', 'autonomous');

-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "source" "RepositorySource" NOT NULL;
ALTER TABLE "Repository" ALTER COLUMN "externalRepoUrl" DROP NOT NULL;
