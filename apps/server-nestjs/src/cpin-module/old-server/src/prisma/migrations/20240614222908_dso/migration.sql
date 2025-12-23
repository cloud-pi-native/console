DO $$
DECLARE
    env_row RECORD;
BEGIN
    -- Début de la boucle sur chaque ligne de la table 'Project'
    FOR env_row IN SELECT "projectId", "clusterId" FROM public."Environment" LOOP
        INSERT INTO public."ProjectClusterHistory" ("projectId", "clusterId")
        VALUES (env_row."projectId", env_row."clusterId")
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;