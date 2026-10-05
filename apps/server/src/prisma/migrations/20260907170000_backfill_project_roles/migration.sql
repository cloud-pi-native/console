-- Backfill the 4 default system roles on projects that have none.
-- Mirrors generateProjectCreateInput (apps/server-nestjs/src/modules/project/project.utils.ts):
--   Administrateur  = MANAGE                                                       = 2
--   DevOps          = MANAGE_ENVIRONMENTS | MANAGE_REPOSITORIES | REPLAY_HOOKS
--                     | SEE_SECRETS | LIST_ENVIRONMENTS | LIST_REPOSITORIES        = 984
--   Développeur     = MANAGE_REPOSITORIES | LIST_ENVIRONMENTS | LIST_REPOSITORIES = 784
--   Lecture seule   = LIST_ENVIRONMENTS | LIST_REPOSITORIES                       = 768
INSERT INTO "ProjectRole" ("id", "name", "permissions", "position", "oidcGroup", "type", "projectId")
SELECT
  gen_random_uuid(),
  r."name",
  r."permissions",
  r."position",
  '/' || p."slug" || r."groupSuffix",
  'system:managed',
  p."id"
FROM "Project" p
CROSS JOIN (VALUES
  ('Administrateur', 2::bigint, 0, '/console/admin'),
  ('DevOps', 984::bigint, 1, '/console/devops'),
  ('Développeur', 784::bigint, 2, '/console/developer'),
  ('Lecture seule', 768::bigint, 3, '/console/readonly')
) AS r("name", "permissions", "position", "groupSuffix")
WHERE NOT EXISTS (
  SELECT 1 FROM "ProjectRole" existing WHERE existing."projectId" = p."id"
);
