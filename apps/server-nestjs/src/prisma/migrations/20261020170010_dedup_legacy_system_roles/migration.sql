-- Dédup des rôles système legacy dupliqués par les backfills
-- (20260908155700, 20261005155118) : ils insèrent le tuple canonique du seed
-- dès qu'une ligne existante dévie, donc le doublon est toujours la ligne
-- legacy. Écarts connus, hardcodés (perdante → gagnante) :
--   Développeur   976@2 → 784@2   (seed legacy apps/server)
--   Lecture seule 768@4 → 768@3   (position legacy)
--   Sécurité      768@3 → 832@4   (perms legacy)
-- Repoint avant suppression : roleIds est un tableau sans FK. Une perdante
-- sans gagnante est conservée (ce serait le seul rôle du projet).

UPDATE "ProjectMembers" pm
SET "roleIds" = ARRAY(
  SELECT COALESCE(k."id"::text, rid)::text
  FROM unnest(pm."roleIds") AS rid
  LEFT JOIN "ProjectRole" d
    ON d."id"::text = rid
   AND d."type" = 'system:managed'
   AND (d."name", d."permissions", d."position") IN (
        ('Développeur',   976::bigint, 2),
        ('Lecture seule', 768::bigint, 4),
        ('Sécurité',      768::bigint, 3))
  LEFT JOIN "ProjectRole" k
    ON d."id" IS NOT NULL
   AND k."projectId" = d."projectId"
   AND k."name" = d."name"
   AND (k."name", k."permissions", k."position") IN (
        ('Développeur',   784::bigint, 2),
        ('Lecture seule', 768::bigint, 3),
        ('Sécurité',      832::bigint, 4))
)
WHERE EXISTS (
  SELECT 1 FROM "ProjectRole" d
  WHERE pm."roleIds" @> ARRAY[d."id"]::text[]
    AND d."type" = 'system:managed'
    AND (d."name", d."permissions", d."position") IN (
        ('Développeur',   976::bigint, 2),
        ('Lecture seule', 768::bigint, 4),
        ('Sécurité',      768::bigint, 3))
);

DELETE FROM "ProjectRole" d
WHERE d."type" = 'system:managed'
  AND (d."name", d."permissions", d."position") IN (
      ('Développeur',   976::bigint, 2),
      ('Lecture seule', 768::bigint, 4),
      ('Sécurité',      768::bigint, 3))
  AND EXISTS (
    SELECT 1 FROM "ProjectRole" k
    WHERE k."projectId" = d."projectId"
      AND k."name" = d."name"
      AND (k."name", k."permissions", k."position") IN (
          ('Développeur',   784::bigint, 2),
          ('Lecture seule', 768::bigint, 3),
          ('Sécurité',      832::bigint, 4))
  );
