-- Multiplication des environnements par clusteurs
ALTER TABLE "Environment" ADD COLUMN "clusterId" UUID;

DO
$$
DECLARE
    perm record;
    cte record;
    env_uuid UUID;
BEGIN
    FOR cte IN SELECT "B" AS environmentId, "A" AS "clusterId", "name", "projectId", status, "updatedAt", "createdAt" 
        FROM public."_ClusterToEnvironment", public."Environment" 
        WHERE public."Environment".id = "B"
    LOOP
        env_uuid := gen_random_uuid();
        INSERT INTO public."Environment" (id, "name", "projectId", "clusterId", status, "createdAt", "updatedAt") VALUES 
            (env_uuid, cte."name", cte."projectId", cte."clusterId", cte.status, cte."createdAt", cte."updatedAt");
        
        FOR perm in SELECT * FROM public."Permission" WHERE "environmentId" = cte.environmentId
        LOOP
            INSERT INTO public."Permission" (id, "level", "createdAt", "updatedAt", "environmentId", "userId") VALUES 
                (gen_random_uuid(), perm."level", perm."createdAt", perm."updatedAt", env_uuid, perm."userId");
        END LOOP;
    END LOOP;
END;
$$
;
DELETE FROM public."Environment" WHERE "clusterId" is null;
ALTER TABLE public."Environment"  ALTER COLUMN "clusterId" SET NOT NULL;
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Delete old _ClusterToEnvironment
ALTER TABLE "_ClusterToEnvironment" DROP CONSTRAINT "_ClusterToEnvironment_A_fkey";
ALTER TABLE "_ClusterToEnvironment" DROP CONSTRAINT "_ClusterToEnvironment_B_fkey";
DROP TABLE "_ClusterToEnvironment";
