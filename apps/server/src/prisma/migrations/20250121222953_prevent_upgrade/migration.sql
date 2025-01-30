-- Vérifie les versions dans la table Project
DO $$
DECLARE
    project_id INT;
    project_name TEXT;
    last_version TEXT;
BEGIN
    -- Boucle sur les projets non archivés
    FOR project_id, project_name, last_version IN (
        SELECT id, name, "lastSuccessProvisionningVersion"
        FROM "Project"
        WHERE "status" != 'archived'
    )
    LOOP
        -- Vérifie si la version est NULL
        IF last_version IS NULL THEN
            RAISE EXCEPTION 'Le projet % (ID: %) a une version NULL.', project_name, project_id;
        END IF;

        -- Vérifie si la version est inférieure à 8.23.0 selon SemVer
        IF (string_to_array(last_version, '.')::int[] < ARRAY[8,23,0]) THEN
            RAISE EXCEPTION 'Le projet % (ID: %) a une version (%), inférieure à 8.23.0.', project_name, project_id, last_version;
        END IF;
    END LOOP;
END $$;
