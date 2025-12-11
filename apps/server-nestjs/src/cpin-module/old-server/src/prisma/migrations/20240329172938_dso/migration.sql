-- AlterTable
ALTER TABLE "Cluster" ADD COLUMN "zoneId" UUID;

-- CreateTable
CREATE TABLE "Zone"
(
    "id" UUID NOT NULL,
    "slug" VARCHAR(10) NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "description" VARCHAR(200),
    "createdAt" TIMESTAMP
(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP
(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_id_key" ON "Zone"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_slug_key" ON "Zone"("slug");

-- Create default zone
INSERT INTO "Zone"
    (id, "slug", "label", "description", "updatedAt")
VALUES
    ('a66c4230-eba6-41f1-aae5-bb1e4f90cce0', 'default', 'Zone Défaut', 'Zone par défaut, à changer', CURRENT_TIMESTAMP);

-- Set default zoneId for current clusters
UPDATE "Cluster"
SET "zoneId"
= 'a66c4230-eba6-41f1-aae5-bb1e4f90cce0'
WHERE "zoneId"
IS NULL;

-- AlterTable
ALTER TABLE "Cluster" ALTER COLUMN "zoneId"
SET
NOT NULL;

-- AddForeignKey
ALTER TABLE "Cluster" ADD CONSTRAINT "Cluster_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id")
ON DELETE RESTRICT ON
UPDATE CASCADE;
