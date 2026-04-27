-- DropForeignKey if exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Permission_environmentId_fkey') THEN
        ALTER TABLE "Permission" DROP CONSTRAINT "Permission_environmentId_fkey";
    END IF;
END $$;

-- DropForeignKey if exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Permission_userId_fkey') THEN
        ALTER TABLE "Permission" DROP CONSTRAINT "Permission_userId_fkey";
    END IF;
END $$;

-- DropForeignKey if exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Role_projectId_fkey') THEN
        ALTER TABLE "Role" DROP CONSTRAINT "Role_projectId_fkey";
    END IF;
END $$;

-- DropForeignKey if exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Role_userId_fkey') THEN
        ALTER TABLE "Role" DROP CONSTRAINT "Role_userId_fkey";
    END IF;
END $$;

-- CreateTable if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ProjectMembers') THEN
        CREATE TABLE "ProjectMembers" (
            "projectId" UUID NOT NULL,
            "userId" UUID NOT NULL,
            "roleIds" TEXT[]
        );
    END IF;
END $$;

-- AlterTable
ALTER TABLE "Log" ADD COLUMN IF NOT EXISTS "projectId" UUID;

INSERT INTO public."User" (id, "firstName", "lastName", email, "createdAt", "updatedAt")
VALUES('04ac168a-2c4f-4816-9cce-af6c612e5912'::uuid, 'Anonymous', 'User', 'anon@user', '2023-07-03 14:46:56.770', '2023-07-03 14:46:56.770')
ON CONFLICT (id) DO NOTHING;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "everyonePerms" BIGINT NOT NULL DEFAULT 896,
ADD COLUMN IF NOT EXISTS "ownerId" UUID;

DO $$
DECLARE
    role_row RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Role') THEN
        -- Début de la boucle sur chaque ligne de la table 'Project'
        FOR role_row IN SELECT "userId", "projectId", "role" FROM public."Role" LOOP
            INSERT INTO public."ProjectMembers" ("userId", "projectId", "roleIds") VALUES (role_row."userId", role_row."projectId", '{}');
            IF role_row."role" = 'owner'::public."RoleList" THEN
                UPDATE public."Project"
                SET "ownerId"=role_row."userId"
                WHERE id=role_row."projectId"::uuid;
            END IF;
        END LOOP;
    END IF;
END $$;

UPDATE public."Project"
SET "ownerId"='04ac168a-2c4f-4816-9cce-af6c612e5912'
WHERE "ownerId" IS NULL;

ALTER TABLE public."Project" ALTER COLUMN "ownerId" SET NOT NULL;

DELETE FROM public."ProjectMembers" pm
USING public."Project" p
WHERE pm."userId" = p."ownerId"
AND pm."projectId" = p."id";

-- DropTable if exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Permission') THEN
        DROP TABLE "Permission";
    END IF;
END $$;

-- DropTable if exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Role') THEN
        DROP TABLE "Role";
    END IF;
END $$;

-- DropEnum if exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleList') THEN
        DROP TYPE "RoleList";
    END IF;
END $$;

-- CreateTable if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AdminRole') THEN
        CREATE TABLE "AdminRole" (
            "id" UUID NOT NULL,
            "name" TEXT NOT NULL,
            "permissions" BIGINT NOT NULL,
            "position" SMALLINT NOT NULL,
            CONSTRAINT "AdminRole_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- CreateTable if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ProjectRole') THEN
        CREATE TABLE "ProjectRole" (
            "id" UUID NOT NULL,
            "name" TEXT NOT NULL,
            "permissions" BIGINT NOT NULL,
            "projectId" UUID NOT NULL,
            "position" SMALLINT NOT NULL,
            CONSTRAINT "ProjectRole_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- CreateIndex if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminRole_id_key') THEN
        CREATE UNIQUE INDEX "AdminRole_id_key" ON "AdminRole"("id");
    END IF;
END $$;

-- CreateIndex if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminRole_name_key') THEN
        CREATE UNIQUE INDEX "AdminRole_name_key" ON "AdminRole"("name");
    END IF;
END $$;

-- CreateIndex if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ProjectMembers_projectId_userId_key') THEN
        CREATE UNIQUE INDEX "ProjectMembers_projectId_userId_key" ON "ProjectMembers"("projectId", "userId");
    END IF;
END $$;

-- CreateIndex if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ProjectRole_id_key') THEN
        CREATE UNIQUE INDEX "ProjectRole_id_key" ON "ProjectRole"("id");
    END IF;
END $$;

-- CreateIndex if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Environment_projectId_name_key') THEN
        CREATE UNIQUE INDEX "Environment_projectId_name_key" ON "Environment"("projectId", "name");
    END IF;
END $$;

-- AddForeignKey if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Log_projectId_fkey') THEN
        ALTER TABLE "Log" ADD CONSTRAINT "Log_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Project_ownerId_fkey') THEN
        ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMembers_projectId_fkey') THEN
        ALTER TABLE "ProjectMembers" ADD CONSTRAINT "ProjectMembers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMembers_userId_fkey') THEN
        ALTER TABLE "ProjectMembers" ADD CONSTRAINT "ProjectMembers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectRole_projectId_fkey') THEN
        ALTER TABLE "ProjectRole" ADD CONSTRAINT "ProjectRole_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminRoleIds" TEXT[];
