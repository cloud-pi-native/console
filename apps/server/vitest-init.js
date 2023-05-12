import { vi } from 'vitest'

process.env.ARGOCD_URL = 'https://argo-cd.readthedocs.io'
process.env.GITLAB_URL = 'https://gitlab.com'
process.env.HARBOR_URL = 'https://goharbor.io'
process.env.NEXUS_URL = 'https://sonatype.com/products/nexus-repository'
process.env.SONARQUBE_URL = 'https://www.sonarqube.org'
process.env.VAULT_URL = 'https://www.vaultproject.io'

vi.mock('./src/plugins/index.js', async () => {
  return {
    default: {
      checkServices: () => {},

      createProject: () => {},
      archiveProject: () => {},

      createRepository: () => {},
      updateRepository: () => {},
      deleteRepository: () => {},

      addUserToProject: () => {},
      updateUserProjectRole: () => {},
      removeUserFromProject: () => {},

      initializeEnvironment: () => {},
      deleteEnvironment: () => {},

      setPermission: () => {},
      updatePermission: () => {},
      deletePermission: () => {},
    },
  }
})
