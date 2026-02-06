-- Update existing Admin role to be system role 'Root Plateforme'
UPDATE "AdminRole"
SET
  "name" = 'Root Plateforme',
  "type" = 'system',
  "permissions" = 3, -- Assuming 3n means bit 0 and 1 (1 | 2 = 3)
  "oidcGroup" = '/admin',
  "position" = 0
WHERE "id" = '76229c96-4716-45bc-99da-00498ec9018c'::uuid;

-- Insert 'Lecture Seule Plateforme' system role if it doesn't exist
INSERT INTO "AdminRole" ("id", "name", "permissions", "position", "oidcGroup", "type")
VALUES (
  '35848aa2-e881-4770-9844-0c5c3693e506'::uuid,
  'Lecture Seule Plateforme',
  1, -- Assuming 1n means bit 0
  2,
  '/readonly',
  'system'
)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = 'Lecture Seule Plateforme',
  "type" = 'system',
  "permissions" = 1,
  "oidcGroup" = '/readonly';
