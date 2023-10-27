-- Associate cluster to Stages
-- CreateTable
CREATE TABLE "_ClusterToStage" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);
-- AddForeignKey
ALTER TABLE "_ClusterToStage" ADD CONSTRAINT "_ClusterToStage_A_fkey" FOREIGN KEY ("A") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterToStage" ADD CONSTRAINT "_ClusterToStage_B_fkey" FOREIGN KEY ("B") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "_ClusterToStage_AB_unique" ON "_ClusterToStage"("A", "B");

-- CreateIndex
CREATE INDEX "_ClusterToStage_B_index" ON "_ClusterToStage"("B");

DO
$$
DECLARE
    cluster record;
    cte record;
    env_uuid UUID;
BEGIN
    FOR cluster IN SELECT id
        FROM public."Cluster"
    LOOP
        INSERT INTO public."_ClusterToStage" ("A", "B") VALUES 
            (cluster.id, '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9'),
            (cluster.id, '38fa869d-6267-441d-af7f-e0548fd06b7e'),
            (cluster.id, 'd434310e-7850-4d59-b47f-0772edf50582'),
            (cluster.id, '9b3e9991-896d-4d90-bdc5-a34be8c06b8f');
    END LOOP;
END;
$$
