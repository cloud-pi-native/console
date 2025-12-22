import type { ApiFetcher } from '@ts-rest/core'
import { initClient, initContract } from '@ts-rest/core'

export const apiPrefix: string = '/api/v1'

export const contractInstance: ReturnType<typeof initContract> = initContract()

export async function getContract() {
  return contractInstance.router({
    AdminTokens: (await import('./contracts/index.js')).adminTokenContract,
    AdminRoles: (await import('./contracts/index.js')).adminRoleContract,
    Clusters: (await import('./contracts/index.js')).clusterContract,
    ServiceChains: (await import('./contracts/index.js')).serviceChainContract,
    Environments: (await import('./contracts/index.js')).environmentContract,
    Logs: (await import('./contracts/index.js')).logContract,
    PersonalAccessTokens: (await import('./contracts/index.js'))
      .personalAccessTokenContract,
    Projects: (await import('./contracts/index.js')).projectContract,
    ProjectsMembers: (await import('./contracts/index.js'))
      .projectMemberContract,
    ProjectsRoles: (await import('./contracts/index.js')).projectRoleContract,
    ProjectServices: (await import('./contracts/index.js'))
      .projectServiceContract,
    Repositories: (await import('./contracts/index.js')).repositoryContract,
    Stages: (await import('./contracts/index.js')).stageContract,
    Services: (await import('./contracts/index.js')).serviceContract,
    Users: (await import('./contracts/index.js')).userContract,
    Zones: (await import('./contracts/index.js')).zoneContract,
    System: (await import('./contracts/index.js')).systemContract,
    SystemPlugin: (await import('./contracts/index.js')).systemPluginContract,
    SystemSettings: (await import('./contracts/index.js'))
      .systemSettingsContract,
  })
}

export async function getApiClient(
  baseUrl: string,
  baseHeaders: Record<string, string>,
  api: ApiFetcher | undefined,
): Promise<any> {
  return initClient(await getContract(), {
    baseUrl,
    baseHeaders,
    api,
    validateResponse: false,
  })
}
