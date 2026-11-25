-- The owner is now a member row holding the 'Propriétaire' role, like any other
-- member. Backfill every existing project so that the owner holds the role and
-- nobody else does: an owner created before this change has no member row yet,
-- and a previous owner handed the role by an earlier transfer keeps their row
-- and their other roles but loses that one.
-- Matched on (projectId, name), not oidcGroup: archiving renames the project
-- slug while the role keeps its original group path.
-- Idempotent on replay.

-- 1. A previous owner who was handed the role loses it and keeps their other roles.
UPDATE "ProjectMembers" pm
SET "roleIds" = ARRAY(
  SELECT roleId FROM unnest(pm."roleIds") AS roleId
  WHERE roleId <> po."id"::text
)
FROM "Project" p
JOIN "ProjectRole" po ON po."projectId" = p."id" AND po."name" = 'Propriétaire'
WHERE pm."projectId" = p."id"
  AND pm."userId" <> p."ownerId"
  AND pm."roleIds" @> ARRAY[po."id"::text];

-- 2. The owner gets a member row if they have none yet.
INSERT INTO "ProjectMembers" ("projectId", "userId", "roleIds")
SELECT p."id", p."ownerId", ARRAY[]::text[]
FROM "Project" p
WHERE NOT EXISTS (
  SELECT 1 FROM "ProjectMembers" pm
  WHERE pm."projectId" = p."id" AND pm."userId" = p."ownerId"
);

-- 3. The owner's row gets the role once, whatever roles it already holds.
UPDATE "ProjectMembers" pm
SET "roleIds" = pm."roleIds" || ARRAY[po."id"::text]
FROM "Project" p
JOIN "ProjectRole" po ON po."projectId" = p."id" AND po."name" = 'Propriétaire'
WHERE pm."projectId" = p."id"
  AND pm."userId" = p."ownerId"
  AND NOT (pm."roleIds" @> ARRAY[po."id"::text]);
