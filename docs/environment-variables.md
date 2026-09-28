# Registre des variables d’environnement

Ce registre est la source de vérité de la classification des variables hors legacy. Une nouvelle variable doit être ajoutée ici avant d’être exposée par `mise`, `fnox`, Docker Compose ou GitHub Actions.

| Classe | Variables | Source | Consommateurs |
| --- | --- | --- | --- |
| Configuration publique commune | `NODE_ENV`, `CI`, `APP_VERSION`, `SERVER_HOST`, `SERVER_PORT`, `NESTJS_SERVER_HOST`, `NESTJS_SERVER_PORT`, `CONTACT_EMAIL`, `PROJECTS_ROOT_DIR`, `LOG_LEVEL` | `mise` | client, server-nestjs, Docker Compose, CI |
| Configuration publique navigateur | `SERVER_HOST`, `SERVER_PORT`, `CLIENT_PORT`, `KEYCLOAK_PROTOCOL`, `KEYCLOAK_DOMAIN`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_REDIRECT_URI`, `OPENCDS_ENABLED`, `CONTACT_EMAIL` | `mise` | client |
| Activation et endpoints de services | `USE_ARGOCD`, `USE_GITLAB`, `USE_NEXUS`, `USE_HARBOR`, `USE_SONARQUBE`, `USE_SERVICE_CHAIN`, `USE_VAULT`, `USE_OBSERVABILITY`, `ARGO_NAMESPACE`, `ARGOCD_URL`, `ARGOCD_INTERNAL_URL`, `ARGOCD_EXTRA_REPOSITORIES`, `ARGOCD_SHARED_SOURCE_REPOSITORIES`, `GITLAB_URL`, `GITLAB_INTERNAL_URL`, `GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS`, `GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS`, `GITLAB__SECRET_EXPOSE_INTERNAL_URL`, `HARBOR_URL`, `HARBOR_INTERNAL_URL`, `HARBOR_PROJECT_SLUG_CACHE_TTL_MS`, `HARBOR_RETENTION_CRON`, `HARBOR_ROBOT_EXPIRATION_DAYS`, `HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS`, `HARBOR_RULE_COUNT`, `HARBOR_RULE_TEMPLATE`, `NEXUS_URL`, `NEXUS_INTERNAL_URL`, `NEXUS__SECRET_EXPOSE_INTERNAL_URL`, `SONARQUBE_URL`, `SONARQUBE_INTERNAL_URL`, `GRAFANA_URL`, `DSO_OBSERVABILITY_CHART_VERSION`, `VAULT_URL`, `VAULT_INTERNAL_URL`, `VAULT_KV_NAME`, `VAULT__DEPLOY_VAULT_CONNECTION_IN_NS`, `OPENCDS_URL`, `OPENCDS_INTERNAL_URL`, `OPENCDS_API_TLS_REJECT_UNAUTHORIZED`, `DSO_ENV_CHART_VERSION`, `DSO_NS_CHART_VERSION`, `KUBECONFIG_HOST_PATH`, `KUBECONFIG_PATH`, `KUBECONFIG_CTX`, `EXTERNAL_PLUGINS_DIR_HOST_PATH` | `mise` | server-nestjs, Docker Compose |
| Secrets locaux | `SESSION_SECRET`, `DB_URL`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ADMIN`, `KEYCLOAK_ADMIN_PASSWORD`, `OPENCDS_API_TOKEN` | `fnox` / `pass` | server-nestjs, Docker Compose |
| Secrets d’intégration | `GITLAB_TOKEN`, `HARBOR_ADMIN`, `HARBOR_ADMIN_PASSWORD`, `NEXUS_ADMIN`, `NEXUS_ADMIN_PASSWORD`, `SONAR_API_TOKEN`, `VAULT_TOKEN` | `fnox` / fournisseur du profil | server-nestjs, Docker Compose |
| Secrets CI | secrets GitHub Actions déjà déclarés par le workflow (`SONAR_*`, `ARGOCD_TOKEN`, clés GitHub App et Helm) | GitHub Actions | étape consommatrice uniquement |

## Profils

| Profil | Usage | Source des secrets |
| --- | --- | --- |
| défaut | développement local natif | `pass` sous `fnox/console/local/` |
| `docker` | stack Docker locale | `pass` sous `fnox/console/local/` |
| `integ` | environnement d’intégration | `pass` ou futur fournisseur fnox du profil |
| `ci` | tests déterministes | valeurs de fixture fnox ; secrets GitHub Actions restent limités à leur étape |

## Exception legacy

`apps/server` reste hors de ce registre pendant sa période de décommissionnement. Ses `.env*`, templates et chargeurs sont conservés inchangés et `ci/scripts/init-env.sh` ne sert plus qu’à eux.
