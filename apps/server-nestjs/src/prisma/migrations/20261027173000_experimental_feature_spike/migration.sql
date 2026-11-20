CREATE TABLE "ExperimentalFeatureTarget" (
    "id" UUID NOT NULL,
    "featureKey" TEXT NOT NULL DEFAULT 'opencds',
    "scopeKind" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "requested" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ExperimentalFeatureTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExperimentalFeatureEvent" (
    "id" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentalFeatureEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExperimentalFeatureTarget_featureKey_scopeKind_scopeId_key"
    ON "ExperimentalFeatureTarget"("featureKey", "scopeKind", "scopeId");
CREATE UNIQUE INDEX "ExperimentalFeatureEvent_targetId_revision_key"
    ON "ExperimentalFeatureEvent"("targetId", "revision");
ALTER TABLE "ExperimentalFeatureEvent"
    ADD CONSTRAINT "ExperimentalFeatureEvent_targetId_fkey"
    FOREIGN KEY ("targetId") REFERENCES "ExperimentalFeatureTarget"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
