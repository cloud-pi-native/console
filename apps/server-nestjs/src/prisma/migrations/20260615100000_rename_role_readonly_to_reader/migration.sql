-- Rename the system-managed 'readonly'/'Lecture seule' role to 'reader'/'Lecteur' across AdminRole and ProjectRole

-- Rename ProjectRole: 'Lecture seule' -> 'Lecteur', '/console/readonly' -> '/console/reader'
UPDATE "ProjectRole"
SET
  "name" = 'Lecteur',
  "oidcGroup" = REPLACE("oidcGroup", '/console/readonly', '/console/reader')
WHERE "name" = 'Lecture seule' OR "oidcGroup" LIKE '%/console/readonly';

-- Rename AdminRole: 'Lecture Seule Plateforme' -> 'Lecteur Plateforme', '/readonly' -> '/reader', '/console/readonly' -> '/console/reader'
UPDATE "AdminRole"
SET
  "name" = 'Lecteur Plateforme',
  "oidcGroup" = '/reader'
WHERE "name" = 'Lecture Seule Plateforme' OR "oidcGroup" = '/readonly';

-- Ensure any remaining '/console/readonly' paths are renamed to '/console/reader'
UPDATE "AdminRole"
SET "oidcGroup" = '/console/reader'
WHERE "oidcGroup" = '/console/readonly';
