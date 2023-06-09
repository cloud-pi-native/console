/* eslint-disable @typescript-eslint/no-empty-function */
import { vi } from 'vitest'

process.env.ARGOCD_URL = 'https://argo-cd.readthedocs.io'
process.env.GITLAB_URL = 'https://gitlab.com'
process.env.HARBOR_URL = 'https://goharbor.io'
process.env.NEXUS_URL = 'https://sonatype.com/products/nexus-repository'
process.env.SONARQUBE_URL = 'https://www.sonarqube.org'
process.env.VAULT_URL = 'https://www.vaultproject.io'
process.env.PROJECTS_ROOT_DIR = 'forge-mi/projects'

export const sequelize = await (async () => {
  const { default: SequelizeMock } = await import('sequelize-mock')
  return new SequelizeMock()
})()

vi.mock('./src/plugins/index.js', async () => {
  return {
    default: {
      fetchOrganizations: ({ execute: () => { }, validate: () => { } }),

      checkServices: ({ execute: () => { }, validate: () => { } }),

      createProject: ({ execute: () => { }, validate: () => { } }),
      archiveProject: ({ execute: () => { }, validate: () => { } }),

      createRepository: ({ execute: () => { }, validate: () => { } }),
      updateRepository: ({ execute: () => { }, validate: () => { } }),
      deleteRepository: ({ execute: () => { }, validate: () => { } }),

      addUserToProject: ({ execute: () => { }, validate: () => { } }),
      updateUserProjectRole: ({ execute: () => { }, validate: () => { } }),
      removeUserFromProject: ({ execute: () => { }, validate: () => { } }),

      initializeEnvironment: ({ execute: () => { }, validate: () => { } }),
      deleteEnvironment: ({ execute: () => { }, validate: () => { } }),

      setPermission: ({ execute: () => { }, validate: () => { } }),
      updatePermission: ({ execute: () => { }, validate: () => { } }),
      deletePermission: ({ execute: () => { }, validate: () => { } }),
    },
  }
})
