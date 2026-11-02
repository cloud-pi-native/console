-- Number the custom project roles per project, right after the system block.
--
-- System roles already hold their canonical positions 0-4: the seeds write
-- them and the backfills (20260907170000, 20260908155700, 20261005155118)
-- plus 20261020170000_dedup_system_roles converge legacy rows onto them.
-- This migration only normalizes the custom rows (type <> 'system:managed'):
-- they are numbered from (max system position of the project) + 1 in name
-- order (stable, deterministic), matching the position a new role already
-- receives at create time (max + 1). The offset is derived, not hardcoded,
-- so a future system role added above 4 (e.g. the Propriétaire of #2858)
-- does not collide. The UI never edits positions, so no explicit user
-- ordering is lost.
--
-- Idempotent: re-running recomputes the same numbering; a retry after a
-- partial failure is a no-op. System roles are untouched.

UPDATE "ProjectRole"
SET "position" = ranked."position"
FROM (
  SELECT
    cr."id",
    COALESCE(s."max_pos", 0) + ROW_NUMBER() OVER (
      PARTITION BY cr."projectId"
      ORDER BY cr."name" ASC, cr."id" ASC
    ) AS "position"
  FROM "ProjectRole" cr
  LEFT JOIN (
    SELECT "projectId", MAX("position") AS "max_pos"
    FROM "ProjectRole"
    WHERE "type" = 'system:managed'
    GROUP BY "projectId"
  ) s ON s."projectId" = cr."projectId"
  WHERE cr."type" <> 'system:managed'
) ranked
WHERE "ProjectRole"."id" = ranked."id";
