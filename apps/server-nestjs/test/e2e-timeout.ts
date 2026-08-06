// e2e specs hit real external services; the latency lives in the operation, not the test shape,
// so name the budget by what the call actually does instead of a bare size.
export const E2E_TIMEOUT = {
  provision: 30_000, // single small resource: sonarqube user + project
  syncGroups: 60_000, // keycloak group/role reconciliation
  syncExternal: 72_000, // gitlab group+member sync, nexus/registry external teardown
  gitReconcile: 144_000, // argocd commit + sync to git
  provisionHeavy: 180_000, // vault mount/policy/approle, zone secrets space
} as const
