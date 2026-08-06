// e2e specs hit real external services; the latency lives in the operation, not the test shape.
// Each timeout names the task it bounds so a reader knows which system and operation it covers.
export const SONARQUBE_PROJECT_TIMEOUT = 30_000 // provision + delete a SonarQube project/user
export const KEYCLOAK_GROUP_SYNC_TIMEOUT = 60_000 // reconcile Keycloak groups/roles
export const EXTERNAL_SYNC_TIMEOUT = 72_000 // sync GitLab groups/members, teardown Nexus/registry
export const ARGOCD_RECONCILE_TIMEOUT = 144_000 // ArgoCD commit + sync to git
export const VAULT_PROVISION_TIMEOUT = 180_000 // provision Vault mounts/policies/approles, zone secrets
