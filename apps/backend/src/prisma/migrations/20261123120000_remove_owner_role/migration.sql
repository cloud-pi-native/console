-- Remove the dedicated 'Propriétaire' system role (inverse of
-- 20261020190000_add_owner_role).
--
-- System roles are identified by type and name, never by oidcGroup: that path
-- is derived from the project slug, which archive() rewrites without touching
-- the roles, and ProjectRolesService.create lets a custom role claim the very
-- same '/console/owner' path. ProjectRolesService rejects system types on create
-- and on patch, so the type filter never matches a custom role.
--
-- The owner keeps Console rights through the Administrateur role: their member
-- row is created when missing, as project creation now does.
-- Idempotent on replay.

-- Every managed role above the removed one shifts back up one position,
-- restoring the pre-owner ordering (Administrateur back to 0).
UPDATE "ProjectRole" r
SET "position" = r."position" - 1
FROM "Project" p
WHERE r."projectId" = p."id"
  AND r."position" >= 1
  AND r."type" = 'system:managed'
  AND EXISTS (
    SELECT 1 FROM "ProjectRole" po
    WHERE po."projectId" = p."id"
      AND po."type" = 'system:managed'
      AND po."name" = 'Propriétaire'
  );

-- Owners holding the deleted role keep their rights: remap the dangling
-- roleIds to the project's Administrateur role. roleIds is a plain text[]
-- with no FK, so the DELETE alone would orphan those ids and
-- resolveProjectPermissions would silently drop them.
UPDATE "ProjectMembers" pm
SET "roleIds" = array_replace(pm."roleIds", po."id"::text, pa."id"::text)
FROM "ProjectRole" po
JOIN "Project" p ON p."id" = po."projectId"
JOIN "ProjectRole" pa ON pa."projectId" = p."id"
  AND pa."type" = 'system:managed'
  AND pa."name" = 'Administrateur'
WHERE po."projectId" = p."id"
  AND po."type" = 'system:managed'
  AND po."name" = 'Propriétaire'
  AND po."id"::text = ANY(pm."roleIds");

DELETE FROM "ProjectRole" r
WHERE r."type" = 'system:managed'
  AND r."name" = 'Propriétaire';

-- The owner is a regular member with an empty role list, on every project.
INSERT INTO "ProjectMembers" ("projectId", "userId", "roleIds")
SELECT p."id", p."ownerId", ARRAY[]::TEXT[]
FROM "Project" p
WHERE NOT EXISTS (
  SELECT 1 FROM "ProjectMembers" pm
  WHERE pm."projectId" = p."id" AND pm."userId" = p."ownerId"
)
ON CONFLICT ("projectId", "userId") DO NOTHING;
