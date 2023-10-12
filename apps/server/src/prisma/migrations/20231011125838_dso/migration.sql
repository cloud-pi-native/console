-- CreateEnum
CREATE TYPE "QuotaStageStatus" AS ENUM ('active', 'pendingDelete');

-- Create new tables
-- CreateTable
CREATE TABLE "Quota" (
    "id" UUID NOT NULL,
    "memory" VARCHAR NOT NULL,
    "cpu" REAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" UUID NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- Associate Quotas and Stages
-- CreateTable
CREATE TABLE "QuotaStage" (
    "id" UUID NOT NULL,
    "quotaId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "status" "QuotaStageStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "QuotaStage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Quota_id_key" ON "Quota"("id");
CREATE UNIQUE INDEX "Quota_name_key" ON "Quota"("name");
CREATE UNIQUE INDEX "Stage_id_key" ON "Stage"("id");
CREATE UNIQUE INDEX "Stage_name_key" ON "Stage"("name");
CREATE UNIQUE INDEX "QuotaStage_id_key" ON "QuotaStage"("id");
CREATE UNIQUE INDEX "QuotaStage_quotaId_stageId_key" ON "QuotaStage"("quotaId", "stageId");
ALTER TABLE "QuotaStage" ADD CONSTRAINT "QuotaStage_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "Quota"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuotaStage" ADD CONSTRAINT "QuotaStage_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create default values for Quotas and Stages
-- Quota
INSERT INTO "Quota" (id, cpu, memory, "name", "private") VALUES
    ('5a57b62f-2465-4fb6-a853-5a751d099199', 2, '4Gi', 'small', false),
    ('08770663-3b76-4af6-8978-9f75eda4faa7', 4, '8Gi', 'medium', false),
    ('b7b4d9bd-7a8f-4287-bb12-5ce2dadb4ff2', 6, '12Gi', 'large', false),
    ('97b851e8-9067-4a3d-a0e8-c3a6820c49be', 8, '16Gi', 'xlarge', false);

-- Stage
INSERT INTO "Stage" (id, "name") VALUES
    ('4a9ad694-4c54-4a3c-9579-548bf4b7b1b9','dev'),
    ('38fa869d-6267-441d-af7f-e0548fd06b7e','staging'),
    ('d434310e-7850-4d59-b47f-0772edf50582','integration'),
    ('9b3e9991-896d-4d90-bdc5-a34be8c06b8f','prod');

-- QuotaStage
INSERT INTO "QuotaStage" (id, "quotaId", "stageId") VALUES
    ('0cb0c549-560e-4f26-8f4e-832dd722f68a','5a57b62f-2465-4fb6-a853-5a751d099199','4a9ad694-4c54-4a3c-9579-548bf4b7b1b9'),
    ('0530e9c9-b37d-4dec-93e6-1895f700e61c','5a57b62f-2465-4fb6-a853-5a751d099199','38fa869d-6267-441d-af7f-e0548fd06b7e'),
    ('8a99db49-b7b1-44bf-865d-5e709e8aa0fc','5a57b62f-2465-4fb6-a853-5a751d099199','d434310e-7850-4d59-b47f-0772edf50582'),
    ('67561f00-d219-4ca6-b94a-3ee83f09d2d6','5a57b62f-2465-4fb6-a853-5a751d099199','9b3e9991-896d-4d90-bdc5-a34be8c06b8f'),
    ('8b3c201e-7518-4254-a94a-16c404e46936','08770663-3b76-4af6-8978-9f75eda4faa7','4a9ad694-4c54-4a3c-9579-548bf4b7b1b9'),
    ('9157ae12-3e39-43f8-a24f-ae5d9c6b69b7','08770663-3b76-4af6-8978-9f75eda4faa7','38fa869d-6267-441d-af7f-e0548fd06b7e'),
    ('c733a1dd-c9fd-4def-b29e-df49ef7b6698','08770663-3b76-4af6-8978-9f75eda4faa7','d434310e-7850-4d59-b47f-0772edf50582'),
    ('15a51f47-0ab2-4a94-a808-722639d8c092','08770663-3b76-4af6-8978-9f75eda4faa7','9b3e9991-896d-4d90-bdc5-a34be8c06b8f'),
    ('cb66e80c-2304-472d-bc19-a411011674ca','b7b4d9bd-7a8f-4287-bb12-5ce2dadb4ff2','d434310e-7850-4d59-b47f-0772edf50582'),
    ('59fb0e79-3a76-4b96-81d4-63f4caa98cfa','b7b4d9bd-7a8f-4287-bb12-5ce2dadb4ff2','9b3e9991-896d-4d90-bdc5-a34be8c06b8f'),
    ('4174b22c-2bee-4f4a-9d85-da7b5463f214','97b851e8-9067-4a3d-a0e8-c3a6820c49be','d434310e-7850-4d59-b47f-0772edf50582'),
    ('de0589b6-7cf5-4f1e-ab44-53e71a6cdb7a','97b851e8-9067-4a3d-a0e8-c3a6820c49be','9b3e9991-896d-4d90-bdc5-a34be8c06b8f');
