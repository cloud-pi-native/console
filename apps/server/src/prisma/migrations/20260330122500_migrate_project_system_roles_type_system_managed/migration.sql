-- Migrate well-known project roles to the new "system:"-prefixed type
UPDATE "ProjectRole"
SET "type" = 'system:managed'
WHERE
  "type" = 'managed'
  AND "oidcGroup" ~ '^/[^/]+/console/(admin|devops|developer|readonly)$';

-- Migrate well-known admin roles to the new "system:"-prefixed type
UPDATE "AdminRole"
SET "type" = 'system:managed'
WHERE id IN (
  '76229c96-4716-45bc-99da-00498ec9018c',
  '6bebe7b2-0f0a-456e-ab7f-b3d7640a7cbf',
  '35848aa2-e881-4770-9844-0c5c3693e506'
);

-- Migrate everyone role to the new "system:"-prefixed type
UPDATE "AdminRole"
SET "type" = 'system:global'
WHERE id = '034f589f-1750-4b15-bb34-4cd995e7fcaa';
