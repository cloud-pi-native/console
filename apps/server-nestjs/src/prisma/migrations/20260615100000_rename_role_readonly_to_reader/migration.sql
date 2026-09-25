-- Rename the system-managed 'readonly'/'Lecture seule' role to 'reader'/'Lecture' across AdminRole and ProjectRole
-- Each UPDATE only rewrites its own field, so a name match never clobbers a custom oidcGroup and vice versa.

-- ProjectRole: rename the system-managed name only
UPDATE "ProjectRole"
SET "name" = 'Lecture'
WHERE "name" = 'Lecture seule';

-- ProjectRole: rename the OIDC group paths only
UPDATE "ProjectRole"
SET "oidcGroup" = REPLACE("oidcGroup", '/console/readonly', '/console/reader')
WHERE "oidcGroup" LIKE '%/console/readonly';

-- AdminRole: rename the system-managed name only
UPDATE "AdminRole"
SET "name" = 'Lecteur Plateforme'
WHERE "name" = 'Lecture Seule Plateforme';

-- AdminRole: rename the OIDC group paths only
UPDATE "AdminRole"
SET "oidcGroup" = '/reader'
WHERE "oidcGroup" = '/readonly';

UPDATE "AdminRole"
SET "oidcGroup" = '/console/reader'
WHERE "oidcGroup" = '/console/readonly';