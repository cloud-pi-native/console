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
