-- Tighten the 20260907170000_backfill_project_roles anti-join to the role
-- level: the original matches on projectId only, so any project owning at
-- least one ProjectRole row never receives its missing system roles.
-- Mirrors generateProjectCreateInput (apps/server-nestjs/src/modules/project/project.utils.ts):
--   Administrateur  = MANAGE                                                       = 2
--   DevOps          = MANAGE_ENVIRONMENTS | MANAGE_REPOSITORIES | REPLAY_HOOKS
--                     | SEE_SECRETS | LIST_ENVIRONMENTS | LIST_REPOSITORIES        = 984
--   Développeur     = MANAGE_REPOSITORIES | LIST_ENVIRONMENTS | LIST_REPOSITORIES = 784
--   Lecture seule   = LIST_ENVIRONMENTS | LIST_REPOSITORIES                       = 768
-- Anti-join on projectId + name + position + oidcGroup + permissions makes
-- the INSERT idempotent: each absent system role is inserted individually,
-- existing rows of any kind are untouched, a retry is a no-op.
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
  SELECT 1
  FROM "ProjectRole" existing
  WHERE existing."projectId" = p."id"
    AND existing."name" = r."name"
    AND existing."position" = r."position"
    AND existing."oidcGroup" = '/' || p."slug" || r."groupSuffix"
    AND existing."permissions" = r."permissions"
);
