-- Verrou : un seul rôle système par (projectId, name), garanti par la base.
-- Tout doublon inséré par un futur backfill fait échouer la migration au
-- niveau base plutôt que de corrompre silencieusement.
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectRole_system_name_key"
  ON "ProjectRole"("projectId", "name")
  WHERE "type" = 'system:managed';
