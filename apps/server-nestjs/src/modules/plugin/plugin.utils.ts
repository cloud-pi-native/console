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
export type PluginName = 'argocd'
  | 'gitlab'
  | 'nexus'
  | 'vault'
  | 'keycloak'
  | 'harbor'
  | 'sonarqube'
  | 'observability'

export type PluginResult = {
  status: 'OK'
  message: string
  executionTime: number
} | {
  status: 'KO'
  message: string
  executionTime: number
  error: unknown
}

export type PluginResults = Partial<Record<PluginName, PluginResult>>

export type RequiredPluginResult<T extends PluginName>
  = { [K in T]: PluginResult } & PluginResults

export function mergePluginResults(responses: PluginResults[]): PluginResults {
  return responses.reduce((merged, currentResponse) => {
    return { ...merged, ...currentResponse }
  }, {} as PluginResults)
}

export function getFailedPlugins(response: PluginResults): PluginName[] {
  const entries = Object.entries(response) as [PluginName, PluginResult][]

  return entries
    .filter(([_, result]) => result.status === 'KO')
    .map(([pluginName]) => pluginName)
}
