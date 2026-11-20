INSERT INTO "AdminRole" ("id", "name", "permissions", "position", "oidcGroup", "type")
SELECT
  '487450e6-3265-4df2-8581-8e39b0cecc5d'::uuid,
  'Sécurité Plateforme',
  1,
  3,
  '/console/security',
  'system:managed'
WHERE NOT EXISTS (
  SELECT 1 FROM "AdminRole"
  WHERE "oidcGroup" = '/console/security'
     OR "id" = '487450e6-3265-4df2-8581-8e39b0cecc5d'::uuid
);
