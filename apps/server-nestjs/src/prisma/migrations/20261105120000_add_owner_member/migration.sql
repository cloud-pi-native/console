-- Backfill: le propriétaire du projet devient une ligne ProjectMembers
-- régulière, alignant les projets existants sur le seeding TS de
-- project.utils.ts. roleIds reste vide : le rôle « Propriétaire » n'est
-- attaché aux roleIds qu'au transfert (project.service.ts ownerChange).
-- L'anti-jointure rend la migration idempotente sur rejouabilité.

INSERT INTO "ProjectMembers" ("projectId", "userId", "roleIds")
SELECT p."id", p."ownerId", '{}'::TEXT[]
FROM "Project" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProjectMembers" m
  WHERE m."projectId" = p."id"
    AND m."userId" = p."ownerId"
);
