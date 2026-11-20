-- Set the Root Administrateur Plateforme admin role to external system-managed type
UPDATE "AdminRole"
SET "type" = 'system:external'
WHERE "id" = '76229c96-4716-45bc-99da-00498ec9018c';
