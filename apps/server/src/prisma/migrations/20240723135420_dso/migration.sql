/*
  Warnings:

  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[projectId,name]` on the table `Environment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownerId` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_environmentId_fkey";

-- DropForeignKey
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_userId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_userId_fkey";

-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "projectId" UUID;

INSERT INTO public."User" (id, "firstName", "lastName", email, "createdAt", "updatedAt")
VALUES('04ac168a-2c4f-4816-9cce-af6c612e5912'::uuid, 'Anonymous', 'User', 'anon@user', '2023-07-03 14:46:56.770', '2023-07-03 14:46:56.770');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "everyonePerms" BIGINT NOT NULL DEFAULT 896,
ADD COLUMN     "ownerId" UUID;

DO $$
DECLARE
    role_row RECORD;
BEGIN
    -- Début de la boucle sur chaque ligne de la table 'Project'
    FOR role_row IN SELECT "userId", "projectId", "role" FROM public."Role" LOOP
        IF role_row."role" = 'owner'::public."RoleList" THEN
            UPDATE public."Project"
            SET "ownerId"=role_row."userId"
            WHERE id=role_row."projectId"::uuid;
        END IF;
    END LOOP;
END $$;

UPDATE public."Project"
SET "ownerId"='04ac168a-2c4f-4816-9cce-af6c612e5912'
WHERE "ownerId" IS NULL;

ALTER TABLE public."Project" ALTER COLUMN "ownerId" SET NOT NULL;

-- DropTable
DROP TABLE "Permission";

-- DropTable
DROP TABLE "Role";

-- DropEnum
DROP TYPE "RoleList";

-- CreateTable
CREATE TABLE "AdminRole" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" BIGINT NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "AdminRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMembers" (
    "projectId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleIds" TEXT[]
);

-- CreateTable
CREATE TABLE "ProjectRole" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" BIGINT NOT NULL,
    "projectId" UUID NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "ProjectRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminRole_id_key" ON "AdminRole"("id");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRole_name_key" ON "AdminRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMembers_projectId_userId_key" ON "ProjectMembers"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRole_id_key" ON "ProjectRole"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_projectId_name_key" ON "Environment"("projectId", "name");

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembers" ADD CONSTRAINT "ProjectMembers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembers" ADD CONSTRAINT "ProjectMembers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRole" ADD CONSTRAINT "ProjectRole_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminRoleIds" TEXT[];