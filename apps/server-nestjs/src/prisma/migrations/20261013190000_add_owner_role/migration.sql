-- Backfill the project system role 'Propriétaire' on existing projects, separating
-- the owner from the admin role. Mirrors the TS seeding in project.utils.ts:
--   permissions 2 = MANAGE, position 0, oidcGroup = '/<project.slug>/console/owner'
-- Existing roles shift down one position to make room.
-- Anti-join on slug+position makes the INSERT idempotent: a retry after a
-- partial failure, or a project that already has the role, is a no-op.

UPDATE "ProjectRole" r
SET "position" = r."position" + 1
FROM "Project" p
WHERE r."projectId" = p."id"
  AND r."position" >= 1
  AND r."type" = 'system:managed'
  AND NOT EXISTS (
    SELECT 1 FROM "ProjectRole" po
    WHERE po."projectId" = p."id"
      AND po."oidcGroup" = '/' || p."slug" || '/console/owner'
  );

INSERT INTO "ProjectRole" ("id", "name", "permissions", "projectId", "position", "oidcGroup", "type")
SELECT
  gen_random_uuid(),
  'Propriétaire',
  2, -- MANAGE
  p."id",
  0,
  '/' || p."slug" || '/console/owner',
  'system:managed'
FROM "Project" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProjectRole" r
  WHERE r."projectId" = p."id"
    AND r."oidcGroup" = '/' || p."slug" || '/console/owner'
);
