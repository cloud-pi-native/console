-- Update 'Tout le monde' role to be system if it exists
UPDATE "AdminRole"
SET "type" = 'system'
WHERE "name" = 'Tout le monde';

-- Insert 'Tout le monde' role if it does not exist
INSERT INTO "AdminRole" ("id", "name", "permissions", "position", "oidcGroup", "type")
SELECT
  '034f589f-1750-4b15-bb34-4cd995e7fcaa'::uuid,
  'Tout le monde',
  0,
  (SELECT COALESCE(MAX("position"), 0) + 1 FROM "AdminRole"),
  '',
  'system'
WHERE NOT EXISTS (
  SELECT 1 FROM "AdminRole" WHERE "name" = 'Tout le monde'
);
