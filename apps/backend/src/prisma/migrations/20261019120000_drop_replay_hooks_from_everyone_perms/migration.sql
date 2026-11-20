-- Drop REPLAY_HOOKS from the default 'Tout le monde' project permissions.
-- PROJECT_PERMS bits (packages/shared/src/utils/permissions.ts):
--   REPLAY_HOOKS = 128, LIST_ENVIRONMENTS = 256, LIST_REPOSITORIES = 512.
-- The historic Prisma default everyonePerms = 896 = REPLAY_HOOKS
-- | LIST_ENVIRONMENTS | LIST_REPOSITORIES granted project reprovisioning
-- to every authenticated user by default. Keep only the two list
-- permissions (768): the schema default changes to 768 in the same commit
-- and existing rows are realigned here. Admins who genuinely want
-- everyone-replay can re-grant the permission from the project roles
-- screen afterwards.
ALTER TABLE "Project" ALTER COLUMN "everyonePerms" SET DEFAULT 768;
UPDATE "Project"
SET "everyonePerms" = "everyonePerms" & ~128::bigint
WHERE "everyonePerms" & 128::bigint <> 0;
