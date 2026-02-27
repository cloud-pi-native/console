-- Consolidated migration for 'Tout le monde' role
INSERT INTO "AdminRole" ("id", "name", "permissions", "position", "oidcGroup", "type")
VALUES (
  '034f589f-1750-4b15-bb34-4cd995e7fcaa'::uuid,
  'Tout le monde',
  25608, -- MANAGE_PROJECTS | LIST_PROJECTS | LIST_ZONES | LIST_STAGES
  (SELECT COALESCE(MAX("position"), 0) + 1 FROM "AdminRole"),
  '/console',
  'system'
)
