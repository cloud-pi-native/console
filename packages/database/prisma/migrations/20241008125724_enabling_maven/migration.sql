DO $$
DECLARE
    project_row RECORD;
    registry_id INT;
BEGIN
    -- Début de la boucle sur chaque ligne de la table 'Project'
    FOR project_row IN SELECT id FROM public."Project"  WHERE status <> 'archived'::public."ProjectStatus" LOOP
        INSERT INTO public."ProjectPlugin" ("projectId", "pluginName", "key", "value")
        VALUES (project_row.id, 'nexus', 'activateMavenRepo', 'enabled')
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;