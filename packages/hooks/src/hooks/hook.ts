import type { PluginApi } from '../utils/utils.js'
import type * as hooks from './index.js'

export type DefaultArgs = Record<any, any>
export interface PluginResult {
  status: { result: 'OK', message?: string } | { result: 'KO' | 'WARNING', message: string }
  store?: Record<string, string | number | null>
  [key: string]: any
}

export interface HookPayloadResults {
  [x: string]: PluginResult
}
// @ts-ignore
// eslint-disable-next-line unused-imports/no-unused-vars
export interface HookPayloadApis<Args extends DefaultArgs> {
  [x: string]: PluginApi
}
export type Store = Record<string, Record<string, string>> // TO DEPRECIATE USE ONFIG

export interface Config {
  [x: string]: { [x: string]: string }
}

export interface HookPayload<Args extends DefaultArgs> {
  args: Args
  failed: boolean | string[]
  warning: string[]
  results: HookPayloadResults
  apis: HookPayloadApis<Args>
  config: Config
}

export type HookResult<Args extends DefaultArgs> = Omit<HookPayload<Args>, 'apis'> & { totalExecutionTime: number, messageResume?: string }

export type StepCall<Args extends DefaultArgs> = (payload: HookPayload<Args>) => Promise<PluginResult>
type HookStep = Record<string, StepCall<DefaultArgs>>
export type HookStepsNames = 'check' | 'pre' | 'main' | 'post' | 'revert'
export interface Hook<E extends DefaultArgs, V extends DefaultArgs> {
  uniquePlugin?: string // if plugin register on it no other one can register on it
  execute: (args: E, store: Config) => Promise<HookResult<E>>
  validate: (args: V, store: Config) => Promise<HookResult<V>>
  apis: Record<string, (args: E | V) => PluginApi>
  steps: Record<HookStepsNames, HookStep>
}
export type HookList<E extends DefaultArgs, V extends DefaultArgs> = Record<keyof typeof hooks, Hook<E, V>>

function generateMessageResume<Args extends DefaultArgs>(payload: HookPayload<Args>): string | undefined {
  let messageResume = ''
  if (Array.isArray(payload.failed)) {
    for (const pluginName of payload.failed) {
      messageResume += 'Errors:'
      messageResume += `\n${pluginName}: ${payload.results[pluginName].status.message};`
    }
  }
  if (payload.warning.length) {
    for (const pluginName of payload.warning) {
      messageResume += 'Warnings:'
      messageResume += `\n${pluginName}: ${payload.results[pluginName].status.message};`
    }
  }
  return messageResume || undefined
}
export async function executeStep<Args extends DefaultArgs>(step: HookStep, payload: HookPayload<Args>, stepName: string) {
  const names = Object.keys(step)
  const fns = names.map(async (name) => {
    if (payload.results[name]?.executionTime) {
      payload.results[name].executionTime[stepName] = Date.now()
    } else {
      payload.results[name] = {
        status: { result: 'OK' },
        executionTime: { [stepName]: Date.now() },
      }
    }
    const fnResult = await step[name](payload)
    payload.results[name].executionTime[stepName] = Date.now() - payload.results[name].executionTime[stepName]
    return fnResult
  })
  const results = await Promise.all(fns)
  names.forEach((name, index) => {
    if (results[index].status.result === 'KO') {
      payload.failed = Array.isArray(payload.failed)
        ? [...payload.failed, name]
        : [name]
    } else if (results[index].status.result === 'WARNING' && !payload.warning.includes(name)) {
      payload.warning.push(name)
    }
    payload.results[name] = { ...results[index], executionTime: payload.results[name].executionTime }
  })
  return payload
}

export function createHook<E extends DefaultArgs, V extends DefaultArgs>(unique = false) {
  const steps: Record<HookStepsNames, HookStep> = {
    check: {},
    pre: {},
    main: {},
    post: {},
    revert: {},
  }
  const apis: Record<string, (args: E | V) => PluginApi> = {
  }
  const execute = async (args: E, config: Config): Promise<HookResult<E>> => {
    const startTime = Date.now()
    const payloadApis: HookPayloadApis<E | V> = {}
    Object.entries(apis).forEach(([pluginName, apiFn]) => {
      payloadApis[pluginName] = apiFn(args)
    })
    let payload: HookPayload<E> = {
      failed: false,
      args,
      results: {},
      apis: payloadApis,
      config,
      warning: [],
    }

    const executeSteps = ['pre', 'main', 'post'] as const
    for (const step of executeSteps) {
      payload = await executeStep(steps[step], payload, step)
      if (payload.failed) {
        payload = await executeStep(steps.revert, payload, 'revert')
        break
      }
    }
    return {
      args: payload.args,
      results: payload.results,
      failed: payload.failed,
      warning: payload.warning,
      totalExecutionTime: Date.now() - startTime,
      config,
      messageResume: generateMessageResume(payload),
    }
  }

  const validate = async (args: V, config: Config): Promise<HookResult<V>> => {
    const startTime = Date.now()
    const payloadApis: HookPayloadApis<E | V> = {}
    Object.entries(apis).forEach(([pluginName, apiFn]) => {
      payloadApis[pluginName] = apiFn(args)
    })
    const payload: HookPayload<V> = {
      failed: false,
      args,
      results: {},
      apis: payloadApis,
      config,
      warning: [],
    }

    const result = await executeStep(steps.check, payload, 'validate')
    return {
      args: result.args,
      results: result.results,
      failed: result.failed,
      totalExecutionTime: Date.now() - startTime,
      config,
      warning: payload.warning,
      messageResume: generateMessageResume(result),
    }
  }
  const hook: Hook<E, V> = {
    apis,
    steps,
    execute,
    validate,
  }
  if (unique) {
    hook.uniquePlugin = ''
  }
  return hook
}
