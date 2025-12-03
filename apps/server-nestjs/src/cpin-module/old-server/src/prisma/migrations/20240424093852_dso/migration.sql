-- CreateTable
CREATE TABLE "ProjectPlugin" (
    "pluginName" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AdminPlugin" (
    "pluginName" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPlugin_projectId_pluginName_key_key" ON "ProjectPlugin"("projectId", "pluginName", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPlugin_pluginName_key_key" ON "AdminPlugin"("pluginName", "key");

-- AddForeignKey
ALTER TABLE "ProjectPlugin" ADD CONSTRAINT "ProjectPlugin_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
