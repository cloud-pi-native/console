-- Update 'Tout le monde' role with default permissions
-- Permissions: MANAGE_PROJECTS (8) | LIST_PROJECTS (1024) | LIST_ZONES (8192) | LIST_STAGES (16384) = 25608
UPDATE "AdminRole"
SET "permissions" = 25608
WHERE "name" = 'Tout le monde';
