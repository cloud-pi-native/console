-- AlterTable
ALTER TABLE "AdminRole" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'custom';

-- AlterTable
ALTER TABLE "ProjectRole" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'custom';

-- Update AdminRole system roles
UPDATE "AdminRole" SET "type" = 'system' WHERE "name" IN ('Admin', 'Admin Locaux');

-- Update ProjectRole system roles
UPDATE "ProjectRole" SET "type" = 'system' WHERE "name" IN ('Administrateur', 'DevOps', 'Développeur', 'Lecture seule');
