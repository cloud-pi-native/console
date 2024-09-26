import type { PluginApi } from '../utils/utils.js'
import type * as hooks from './index.js'

export type DefaultArgs = Record<any, any>
export interface PluginResult {
  status: { result: 'OK', message?: string } | { result: 'KO', message: string }
  store?: Record<string, string | number>
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
  results: HookPayloadResults
  apis: HookPayloadApis<Args>
  config: Config
}

export type HookResult<Args extends DefaultArgs> = Omit<HookPayload<Args>, 'apis'> & { totalExecutionTime: number }

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
      totalExecutionTime: Date.now() - startTime,
      config,
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
    }

    const result = await executeStep(steps.check, payload, 'validate')
    return {
      args: result.args,
      results: result.results,
      failed: result.failed,
      totalExecutionTime: Date.now() - startTime,
      config,
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
