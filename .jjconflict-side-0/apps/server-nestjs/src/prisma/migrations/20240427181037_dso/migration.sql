DO $$
DECLARE
    project_row RECORD;
    registry_id INT;
BEGIN
    -- Début de la boucle sur chaque ligne de la table 'Project'
    FOR project_row IN SELECT id, services FROM public."Project" LOOP
        -- Extrait 'registry.id' de la colonne JSON 'services'
        registry_id := (SELECT (project_row.services -> 'registry' ->> 'id')::TEXT);
        -- Si 'registry.id' existe, insérer dans la table 'config'
        IF registry_id IS NOT NULL THEN
            INSERT INTO public."ProjectPlugin" ("projectId", "pluginName", "key", "value")
            VALUES (project_row.id, 'registry', 'projectId', registry_id::TEXT);
        END IF;
    END LOOP;
END $$;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "services";
