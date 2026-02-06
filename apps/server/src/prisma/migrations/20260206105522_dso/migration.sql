-- Update existing Admin role to be system role 'Root Administrateur Plateforme'
UPDATE "AdminRole"
SET
  "name" = 'Root Administrateur Plateforme',
  "type" = 'system',
  "permissions" = 3, -- Assuming 3n means bit 0 and 1 (1 | 2 = 3)
  "oidcGroup" = '/admin',
  "position" = 0
WHERE "id" = '76229c96-4716-45bc-99da-00498ec9018c'::uuid;

-- Insert 'Administrateur Plateforme' system role if it doesn't exist
INSERT INTO "AdminRole" ("id", "name", "permissions", "position", "oidcGroup", "type")
VALUES (
  '6bebe7b2-0f0a-456e-ab7f-b3d7640a7cbf'::uuid,
  'Administrateur Plateforme',
  3, -- Assuming 3n means bit 0 and 1 (1 | 2 = 3)
  0,
  '/console/admin',
  'system'
)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = 'Administrateur Plateforme',
  "type" = 'system',
  "permissions" = 3,
  "oidcGroup" = '/console/admin';

-- Update 'Lecture Seule Plateforme' system role
UPDATE "AdminRole"
SET
  "name" = 'Lecture Seule Plateforme',
  "type" = 'system',
  "permissions" = 1,
  "position" = 2,
  "oidcGroup" = '/console/readonly'
WHERE "id" = '35848aa2-e881-4770-9844-0c5c3693e506'::uuid;
