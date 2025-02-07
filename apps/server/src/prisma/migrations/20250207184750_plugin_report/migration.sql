-- CreateTable
CREATE TABLE "PluginReport" (
    "pluginName" TEXT NOT NULL,
    "report" TEXT,
    "updatedAt" TIMESTAMP(3)
);

-- CreateIndex
CREATE UNIQUE INDEX "PluginReport_pluginName_key" ON "PluginReport"("pluginName");
