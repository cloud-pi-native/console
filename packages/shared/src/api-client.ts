import type { ApiFetcher } from '@ts-rest/core'
import { initClient, initContract } from '@ts-rest/core'

export const apiPrefix: string = '/api/v1'

export const contractInstance: ReturnType<typeof initContract> = initContract()

export async function getContract() {
  return contractInstance.router({
    AdminTokens: (await import('./contracts/index.ts')).adminTokenContract,
    AdminRoles: (await import('./contracts/index.ts')).adminRoleContract,
    Clusters: (await import('./contracts/index.ts')).clusterContract,
    ServiceChains: (await import('./contracts/index.ts')).serviceChainContract,
    Environments: (await import('./contracts/index.ts')).environmentContract,
    Logs: (await import('./contracts/index.ts')).logContract,
    PersonalAccessTokens: (await import('./contracts/index.ts'))
      .personalAccessTokenContract,
    Projects: (await import('./contracts/index.ts')).projectContract,
    ProjectsMembers: (await import('./contracts/index.ts'))
      .projectMemberContract,
    ProjectsRoles: (await import('./contracts/index.ts')).projectRoleContract,
    ProjectServices: (await import('./contracts/index.ts'))
      .projectServiceContract,
    Repositories: (await import('./contracts/index.ts')).repositoryContract,
    Stages: (await import('./contracts/index.ts')).stageContract,
    Services: (await import('./contracts/index.ts')).serviceContract,
    Users: (await import('./contracts/index.ts')).userContract,
    Zones: (await import('./contracts/index.ts')).zoneContract,
    System: (await import('./contracts/index.ts')).systemContract,
    SystemPlugin: (await import('./contracts/index.ts')).systemPluginContract,
    SystemSettings: (await import('./contracts/index.ts'))
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
