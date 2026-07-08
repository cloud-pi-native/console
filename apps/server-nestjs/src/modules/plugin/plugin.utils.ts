import type { ToUrlFnParamaters } from '@cpn-console/hooks'
import { Logger } from '@nestjs/common'

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

const logger = new Logger('PluginResult')

/**
 * Runs a plugin task and always resolves with the task's outcome (status,
 * message, execution time and error, if any) keyed under the given plugin
 * name, instead of throwing, so the event emitter can merge and persist the
 * results of every listener.
 *
 * The task keeps its natural shape: do the work, throw on failure, optionally
 * return a message string to override the default 'Up to date'.
 *
 * The `@OnEvent` handler stays a thin, honestly-typed wrapper, while the
 * traced work method keeps `@StartActiveSpan` so the span still records the
 * exception on failure:
 *
 * ```ts
 * @OnEvent('project.upsert')
 * async handleUpsert(project: ProjectWithDetails): Promise<RequiredPluginResult<'argocd'>> {
 *   return capturePluginResult('argocd', () => this.syncProject(project))
 * }
 *
 * @StartActiveSpan()
 * private async syncProject(project: ProjectWithDetails) { ... }
 * ```
 */
export async function capturePluginResult<P extends PluginName>(
  plugin: P,
  task: () => Promise<string | void>,
): Promise<RequiredPluginResult<P>> {
  const start = process.hrtime.bigint()
  const elapsedMs = () => Number(process.hrtime.bigint() - start) / 1_000_000

  try {
    const message = await task()
    return keyedBy(plugin, {
      status: 'OK',
      message: typeof message === 'string' ? message : 'Up to date',
      executionTime: elapsedMs(),
    })
  } catch (error: unknown) {
    logger.error(`${plugin} handler failed`, error)
    return keyedBy(plugin, {
      status: 'KO',
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      executionTime: elapsedMs(),
      error,
    })
  }
}

/**
 * Benign result returned when plugin execution is disabled (the default in
 * test/CI, mirroring the legacy server's `mockHooks`). The real task is not
 * run and no external service is touched.
 */
export function makeDisabledPluginResult<P extends PluginName>(plugin: P): RequiredPluginResult<P> {
  return keyedBy(plugin, {
    status: 'OK',
    message: 'Plugin execution disabled (not in production/integration)',
    executionTime: 0,
  })
}

// TypeScript widens a computed property with a generic key to an index
// signature instead of Record<P, ...>, so the assertion is confined here.
function keyedBy<P extends PluginName>(plugin: P, result: PluginResult): RequiredPluginResult<P> {
  return { [plugin]: result } as RequiredPluginResult<P>
}

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
