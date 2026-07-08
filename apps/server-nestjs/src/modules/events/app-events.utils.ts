import type { LogData } from '../log/log.service'
import type { PluginName, PluginResult, PluginResults } from '../plugin/plugin.utils'
import { getFailedPlugins } from '../plugin/plugin.utils'

/** Per-service result as persisted in the admin logs (legacy hooks format, parsed by LogSchema). */
export interface LoggablePluginResult {
  status: {
    result: 'OK' | 'KO'
    message?: string
  }
  executionTime: {
    main: number
  }
  error?: string
}

function isPluginResult(value: unknown): value is PluginResult {
  return typeof value === 'object'
    && value !== null
    && 'status' in value
    && ((value as PluginResult).status === 'OK' || (value as PluginResult).status === 'KO')
}

/** Narrows an `emitAsync` response to a `PluginResults` object produced by `capturePluginResult` handlers. */
export function isPluginResults(response: unknown): response is PluginResults {
  if (typeof response !== 'object' || response === null) return false
  const values = Object.values(response)
  return values.length > 0 && values.every(isPluginResult)
}

export function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return JSON.stringify({ name: error.name, message: error.message, stack: error.stack })
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function toLoggableResult(result: PluginResult): LoggablePluginResult {
  return {
    status: {
      result: result.status,
      ...(result.message ? { message: result.message } : {}),
    },
    executionTime: { main: Math.round(result.executionTime) },
    ...(result.status === 'KO' ? { error: serializeError(result.error) } : {}),
  }
}

function buildMessageResume(results: PluginResults, failed: PluginName[]): string {
  if (!failed.length) return 'Success'
  const errorLines = failed.map(service => `${service}: ${results[service]?.message};`).join('\n')
  return `Errors:\n${errorLines}`
}

/** Builds the log `data` payload for an event: the emitted args plus every listener's result. */
export function formatEventLogData(args: unknown, results: PluginResults, totalExecutionTime: number): LogData {
  const failed = getFailedPlugins(results)
  const entries = Object.entries(results) as [PluginName, PluginResult][]

  return {
    args,
    failed,
    results: Object.fromEntries(entries.map(([service, result]) => [service, toLoggableResult(result)])),
    totalExecutionTime: Math.round(totalExecutionTime),
    messageResume: buildMessageResume(results, failed),
  }
}
