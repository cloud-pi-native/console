// Observability plugin name
export const PLUGIN_NAME = 'observability'

// Project-scoped repository for custom dashboards and alerts
export const OBSERVABILITY_REPOSITORY = 'infra-observability'

// Global GitLab group + repo for Helm values
export const OBSERVABILITY_GROUP_NAME = 'observability'
export const OBSERVABILITY_REPO_NAME = 'observability'
export const OBSERVABILITY_VALUES_PATH = 'helm/values.yaml'
export const OBSERVABILITY_VALUES_BRANCH = 'main'

// Chart file templates
export const OBSERVABILITY_CHART_FILE = 'Chart.yaml'
export const OBSERVABILITY_TEMPLATE_FILE = 'templates/includes.yaml'

// Keycloak Grafana RBAC group names
export const GRAFANA_GROUP_NAME = 'grafana'
export const GRAFANA_SUBGROUP_HPROD_RW = 'hprod-RW'
export const GRAFANA_SUBGROUP_HPROD_RO = 'hprod-RO'
export const GRAFANA_SUBGROUP_PROD_RW = 'prod-RW'
export const GRAFANA_SUBGROUP_PROD_RO = 'prod-RO'

// Fine-grained RBAC Keycloak groups
export const PROJECT_RBAC_ROLE_ADMIN = 'admin'
export const PROJECT_RBAC_ROLE_DEVOPS = 'devops'
export const PROJECT_RBAC_ROLE_READONLY = 'readonly'

// Plugin configuration keys
export const ENABLED_PLUGIN_KEY = 'enabled'
export const INSTANCES_PLUGIN_KEY = 'instances'

// Environment stage names
export const PROD_ENV = 'prod'
export const HPROD_ENV = 'hprod'
