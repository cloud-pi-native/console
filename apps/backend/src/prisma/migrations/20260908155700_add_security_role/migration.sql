-- Backfill the project system role 'Sécurité' on existing projects.
-- Mirrors the TS seeding in project.utils.ts (generateProjectCreateInput):
--   permissions 832 = SEE_SECRETS(64) | LIST_ENVIRONMENTS(256) | LIST_REPOSITORIES(512)
--   position 4 (after Lecture seule), oidcGroup = '/<project.slug>/console/security'
-- Anti-join on slug+position makes the INSERT idempotent: a retry after a
-- partial failure, or a project that already has the role, is a no-op.

INSERT INTO "ProjectRole" ("id", "name", "permissions", "projectId", "position", "oidcGroup", "type")
SELECT
  gen_random_uuid(),
  'Sécurité',
  832, -- SEE_SECRETS(64) | LIST_ENVIRONMENTS(256) | LIST_REPOSITORIES(512)
  p."id",
  4,
  '/' || p."slug" || '/console/security',
  'system:managed'
FROM "Project" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProjectRole" r
  WHERE r."projectId" = p."id"
    AND r."position" = 4
    AND r."oidcGroup" = '/' || p."slug" || '/console/security'
);
