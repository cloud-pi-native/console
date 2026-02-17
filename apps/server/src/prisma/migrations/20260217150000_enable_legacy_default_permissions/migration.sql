-- Enable legacy default permissions flag
INSERT INTO "SystemSetting"
    ("key", "value")
VALUES
    ('legacy-permissions', 'on');
