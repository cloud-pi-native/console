-- Migrate well-known project roles to the new "system:"-prefixed type
UPDATE "ProjectRole"
SET "type" = 'system:managed'
WHERE
  "type" = 'managed'
  AND "oidcGroup" ~ '^/[^/]+/console/(admin|devops|developer|readonly)$';

-- Migrate well-known admin roles to the new "system:"-prefixed type
UPDATE "AdminRole"
SET "type" = CASE
  WHEN "type" LIKE 'system:%' THEN "type"
  WHEN "type" IN ('managed', 'external') THEN CONCAT('system:', "type")
  ELSE "type"
END
WHERE "oidcGroup" IN ('/admin', '/readonly');
