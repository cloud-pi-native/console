-- Update 'Tout le monde' role with oidcGroup '/'
UPDATE "AdminRole"
SET "oidcGroup" = '/'
WHERE "name" = 'Tout le monde';
