-- Migrate system roles to managed roles
UPDATE "AdminRole"
SET "type" = 'managed'
WHERE "type" = 'system';

-- Migrate system roles to managed roles
UPDATE "ProjectRole"
SET "type" = 'managed'
WHERE "type" = 'system';

-- Update existing Admin role to be an externally managed role
UPDATE "AdminRole"
SET "type" = 'external'
WHERE "id" = '76229c96-4716-45bc-99da-00498ec9018c'::uuid;
