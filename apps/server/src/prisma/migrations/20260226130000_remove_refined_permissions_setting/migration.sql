-- Remove 'refined-permissions' system setting
DELETE FROM "SystemSetting"
WHERE "key" = 'refined-permissions';
