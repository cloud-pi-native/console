import { ApiFetcher, initClient, initContract } from '@ts-rest/core'

export const contractInstance: ReturnType<typeof initContract> = initContract()

export const apiPrefix: string = '/api/v1'

export const getContract = async () => contractInstance.router(
  {
    AdminRoles: (await import('./contracts/index.js')).adminRoleContract,
    Clusters: (await import('./contracts/index.js')).clusterContract,
    Environments: (await import('./contracts/index.js')).environmentContract,
    Logs: (await import('./contracts/index.js')).logContract,
    Organizations: (await import('./contracts/index.js')).organizationContract,
    Permissions: (await import('./contracts/index.js')).permissionContract,
    Projects: (await import('./contracts/index.js')).projectContract,
    ProjectsMembers: (await import('./contracts/index.js')).projectMemberContract,
    ProjectsRoles: (await import('./contracts/index.js')).projectRoleContract,
    ProjectServices: (await import('./contracts/index.js')).projectServiceContract,
    Quotas: (await import('./contracts/index.js')).quotaContract,
    Repositories: (await import('./contracts/index.js')).repositoryContract,
    Stages: (await import('./contracts/index.js')).stageContract,
    Services: (await import('./contracts/index.js')).serviceContract,
    Users: (await import('./contracts/index.js')).userContract,
    Zones: (await import('./contracts/index.js')).zoneContract,
    System: (await import('./contracts/index.js')).systemContract,
    SystemPlugin: (await import('./contracts/index.js')).systemPluginContract,
    SystemSettings: (await import('./contracts/index.js')).systemSettingsContract,
  },
)

export const getApiClient = async (baseUrl: string, baseHeaders: Record<string, string>, api: ApiFetcher | undefined) => initClient(await getContract(), {
  baseUrl,
  baseHeaders,
  api,
  validateResponse: false,
})
