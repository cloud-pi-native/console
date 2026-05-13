import type { ToUrlFnParamaters } from '@cpn-console/hooks'

export function makeToUrlParams(overrides: Partial<ToUrlFnParamaters> = {}): ToUrlFnParamaters {
  return {
    store: {},
    clusters: [],
    zones: [],
    environments: [],
    project: { id: '', slug: 'dulei', name: '' },
    ...overrides,
  }
}
type ServiceName = 'argocd'
  | 'gitlab'
  | 'nexus'
  | 'vault'
  | 'keycloak'
  | 'harbor'
  | 'sonarqube'
  | 'observability'

type ServiceResult = {
  status: 'OK'
  message: string
  executionTime: number
} | {
  status: 'KO'
  message: string
  executionTime: number
  error: unknown
}

export type ServiceResults = Partial<Record<ServiceName, ServiceResult>>

export type RequiredServiceResult<T extends ServiceName>
  = { [K in T]: ServiceResult } & ServiceResults

export function mergeServiceResults(responses: ServiceResults[]): ServiceResults {
  return responses.reduce((merged, currentResponse) => {
    return { ...merged, ...currentResponse }
  }, {} as ServiceResults)
}

export function getFailedServices(response: ServiceResults): ServiceName[] {
  const entries = Object.entries(response) as [ServiceName, ServiceResult][]

  return entries
    .filter(([_, result]) => result.status === 'KO')
    .map(([serviceName]) => serviceName)
}
