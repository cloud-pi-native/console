import { initClient, initContract } from '@ts-rest/core'

export const contractInstance: ReturnType<typeof initContract> = initContract()

export const apiPrefix: string = '/api/v1'

export const getContract = async () => contractInstance.router(
  {
    Clusters: (await import('./contracts/index.js')).clusterContract,
    Environments: (await import('./contracts/index.js')).environmentContract,
    Organizations: (await import('./contracts/index.js')).organizationContract,
    Permissions: (await import('./contracts/index.js')).permissionContract,
    Projects: (await import('./contracts/index.js')).projectContract,
    Quotas: (await import('./contracts/index.js')).quotaContract,
    Repositories: (await import('./contracts/index.js')).repositoryContract,
    Stages: (await import('./contracts/index.js')).stageContract,
    Services: (await import('./contracts/index.js')).serviceContract,
    Users: (await import('./contracts/index.js')).userContract,
    Files: (await import('./contracts/index.js')).filesContract,
    Zones: (await import('./contracts/index.js')).zoneContract,

    ClustersAdmin: (await import('./contracts/index.js')).clusterAdminContract,
    OrganizationsAdmin: (await import('./contracts/index.js')).organizationAdminContract,
    ProjectsAdmin: (await import('./contracts/index.js')).projectAdminContract,
    QuotasAdmin: (await import('./contracts/index.js')).quotaAdminContract,
    StagesAdmin: (await import('./contracts/index.js')).stageAdminContract,
    LogsAdmin: (await import('./contracts/index.js')).logAdminContract,
    UsersAdmin: (await import('./contracts/index.js')).userAdminContract,
    ZonesAdmin: (await import('./contracts/index.js')).zoneAdminContract,

    System: (await import('./contracts/index.js')).systemContract,
  },
  { validateResponseOnClient: true },
)

export const getApiClient = async (baseUrl: string, baseHeaders: Record<string, string>) => initClient(await getContract(), {
  baseUrl,
  baseHeaders,
})
