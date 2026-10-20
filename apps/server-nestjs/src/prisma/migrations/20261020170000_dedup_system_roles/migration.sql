-- Les backfills de rôles système (20260907170000, 20260908155700,
-- 20261005155118) définissent l'idempotence par égalité exacte des champs
-- avec le seed server-nestjs (784/832, positions 0-4). Les projets créés par
-- l'app legacy apps/server portent des valeurs différentes (Développeur 976,
-- Sécurité 768@3, Lecture seule 768@4) : l'anti-join ne reconnait pas le rôle
-- existant et insère un doublon à côté.
--
-- 1. Réparer les doublons : par (projectId, name), garder la ligne conforme au
--    seed actuel, repointer ProjectMembers.roleIds dessus, supprimer les
--    perdantes, puis converge les survivantes vers les valeurs canoniques.
-- 2. Verrouiller : index unique partiel qui rend tout futur doublon de rôle
--    système impossible au niveau base.

-- 1a. Élire la ligne canonique par (projectId, name) : la ligne conforme au
--     pattern oidcGroup des rôles système avec les permissions les plus
--     restrictives (ex : Développeur 784 plutôt que 976).
CREATE TEMP TABLE _dedup_losers ON COMMIT DROP AS
SELECT pr."id" AS lose_id, c.keep_id
FROM "ProjectRole" pr
JOIN (
  SELECT DISTINCT ON (pr."projectId", pr."name")
    pr."projectId",
    pr."name",
    pr."id" AS keep_id
  FROM "ProjectRole" pr
  WHERE pr."type" = 'system:managed'
    AND pr."oidcGroup" ~ '/console/(admin|devops|developer|readonly|security)$'
  ORDER BY pr."projectId", pr."name", pr."permissions" ASC, pr."id" ASC
) c ON c."projectId" = pr."projectId" AND c."name" = pr."name"
WHERE pr."type" = 'system:managed'
  AND pr."id" <> c.keep_id;

-- 1b. Repointer chaque référence membre d'une perdante vers la canonique.
UPDATE "ProjectMembers" pm
SET "roleIds" = array_replace(pm."roleIds", l.lose_id::text, l.keep_id::text)
FROM _dedup_losers l
WHERE pm."roleIds" @> ARRAY[l.lose_id]::text[];

-- 1c. Supprimer les perdantes.
DELETE FROM "ProjectRole" pr
USING _dedup_losers l
WHERE pr."id" = l.lose_id;

-- 1d. Converger les survivantes vers les valeurs canoniques du seed
--     (generateProjectCreateInput) : permissions et positions exactes.
UPDATE "ProjectRole" pr
SET "permissions" = v."permissions",
    "position" = v."position",
    "type" = 'system:managed'
FROM "Project" p
CROSS JOIN (VALUES
  ('Administrateur', 2::bigint, 0),
  ('DevOps', 984::bigint, 1),
  ('Développeur', 784::bigint, 2),
  ('Lecture seule', 768::bigint, 3),
  ('Sécurité', 832::bigint, 4)
) AS v("name", "permissions", "position")
WHERE pr."projectId" = p."id"
  AND pr."name" = v."name"
  AND pr."type" = 'system:managed'
  AND pr."oidcGroup" = '/' || p."slug" || '/console/' ||
    CASE v."name"
      WHEN 'Administrateur' THEN 'admin'
      WHEN 'DevOps' THEN 'devops'
      WHEN 'Développeur' THEN 'developer'
      WHEN 'Lecture seule' THEN 'readonly'
      WHEN 'Sécurité' THEN 'security'
    END;

-- 2. Verrou : un seul rôle système par (projectId, name), garanti par la base.
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectRole_system_name_key"
  ON "ProjectRole"("projectId", "name")
  WHERE "type" = 'system:managed';
