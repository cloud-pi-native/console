-- Converger le type des rôles système : une ligne dont l'oidcGroup correspond
-- au pattern système EST un rôle système, quel que soit son type historique.
-- Ferme l'écart Sécurité legacy restée 'managed' depuis que 20260330122500
-- ignorait le suffixe security de son regex.
UPDATE "ProjectRole"
SET "type" = 'system:managed'
WHERE "oidcGroup" ~ '/console/(admin|devops|developer|readonly|security)$'
  AND "type" <> 'system:managed';
