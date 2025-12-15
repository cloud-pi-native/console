-- Rename default zone
UPDATE "Zone"
SET ("label", "description") = ('DSO', 'Zone par défaut')
WHERE slug = 'default';
