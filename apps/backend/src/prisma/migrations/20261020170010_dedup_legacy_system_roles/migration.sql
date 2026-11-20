-- Dédup des rôles système legacy dupliqués par les backfills
-- (20260908155700, 20261005155118) : ils insèrent le tuple canonique du seed
-- dès qu'une ligne existante dévie, donc le doublon est toujours la ligne
-- legacy. Écarts connus, hardcodés (perdante → gagnante) :
--   Développeur   976 → 784   (seed legacy apps/server)
--   Sécurité      768 → 832   (perms legacy)
--   Lecture seule 768@4 → 768@3 (position legacy)
-- Développeur et Sécurité sont identifiés par permissions seules : leur
-- position dépend de l'ordre de déploiement (20261021170000 peut renuméroter
-- une ligne encore 'managed' avant notre convergence), les permissions jamais.
-- Lecture seule est insensible : elle est déjà system:managed quand
-- 20261021170000 tourne (celui-ci ne touche que type <> 'system:managed').
-- Repoint avant suppression : roleIds est un tableau sans FK. Une perdante
-- sans gagnante est conservée (ce serait le seul rôle du projet).

UPDATE "ProjectMembers" pm
SET "roleIds" = ARRAY(
  SELECT COALESCE(k."id"::text, rid)::text
  FROM unnest(pm."roleIds") AS rid
  LEFT JOIN "ProjectRole" d
    ON d."id"::text = rid
   AND d."type" = 'system:managed'
   AND ( (d."name", d."permissions") IN (('Développeur', 976::bigint),
                                          ('Sécurité', 768::bigint))
      OR (d."name", d."permissions", d."position") = ('Lecture seule', 768::bigint, 4) )
  LEFT JOIN "ProjectRole" k
    ON d."id" IS NOT NULL
   AND k."projectId" = d."projectId"
   AND k."type" = 'system:managed'
   AND k."name" = d."name"
   AND ( (k."name", k."permissions") IN (('Développeur', 784::bigint),
                                         ('Sécurité', 832::bigint))
      OR (k."name", k."permissions", k."position") = ('Lecture seule', 768::bigint, 3) )
)
WHERE EXISTS (
  SELECT 1 FROM "ProjectRole" d
  WHERE pm."roleIds" @> ARRAY[d."id"]::text[]
    AND d."type" = 'system:managed'
    AND ( (d."name", d."permissions") IN (('Développeur', 976::bigint),
                                           ('Sécurité', 768::bigint))
       OR (d."name", d."permissions", d."position") = ('Lecture seule', 768::bigint, 4) )
);

DELETE FROM "ProjectRole" d
WHERE d."type" = 'system:managed'
  AND ( (d."name", d."permissions") IN (('Développeur', 976::bigint),
                                         ('Sécurité', 768::bigint))
     OR (d."name", d."permissions", d."position") = ('Lecture seule', 768::bigint, 4) )
  AND EXISTS (
    SELECT 1 FROM "ProjectRole" k
    WHERE k."projectId" = d."projectId"
      AND k."type" = 'system:managed'
      AND k."name" = d."name"
      AND ( (k."name", k."permissions") IN (('Développeur', 784::bigint),
                                             ('Sécurité', 832::bigint))
         OR (k."name", k."permissions", k."position") = ('Lecture seule', 768::bigint, 3) )
  );
