-- CreateTable
CREATE TABLE "SystemSetting"
(
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- Create maintenance setting
INSERT INTO "SystemSetting"
    ("key", "value")
VALUES
    ('maintenance', 'off');
