-- Backfill : le propriétaire devient une ligne ProjectMembers régulière qui
-- porte le rôle « Propriétaire » réellement appliqué, alignant les projets
-- existants sur le seeding TS de project.utils.ts. La console lit ainsi le
-- rôle depuis les données au lieu d'un libellé synthétique.
-- L'anti-jointure et l'ON CONFLICT rendent la migration idempotente.

INSERT INTO "ProjectMembers" ("projectId", "userId", "roleIds")
SELECT p."id", p."ownerId", ARRAY[r."id"]::TEXT[]
FROM "Project" p
CROSS JOIN LATERAL (
  SELECT r2."id"
  FROM "ProjectRole" r2
  WHERE r2."projectId" = p."id"
    AND r2."oidcGroup" = '/' || p."slug" || '/console/owner'
  ORDER BY r2."id"
  LIMIT 1
) r
ON CONFLICT ("projectId", "userId") DO UPDATE
SET "roleIds" = CASE
  WHEN EXCLUDED."roleIds"[1] = ANY("ProjectMembers"."roleIds")
    THEN "ProjectMembers"."roleIds"
  ELSE "ProjectMembers"."roleIds" || EXCLUDED."roleIds"
END;
