import { PluginApi } from '../utils/utils.js'
import * as hooks from './index.js'

export type DefaultArgs = Record<any, any>
export type PluginResult = {
  status: { result: 'OK', message?: string } | { result: 'KO', message: string },
  [key: string]: any,
}

export interface HookPayloadResults {
  [x:string]: PluginResult
}
// @ts-ignore
export interface HookPayloadApis<Args extends DefaultArgs> { // eslint-disable-line @typescript-eslint/no-unused-vars
  [x: string]: PluginApi
}

export interface HookPayload<Args extends DefaultArgs> {
  args: Args,
  failed: boolean | string[],
  results: HookPayloadResults
  apis: HookPayloadApis<Args>
}

export type HookResult<Args extends DefaultArgs> = Omit<HookPayload<Args>, 'apis'>

export type StepCall<Args extends DefaultArgs> = (payload: HookPayload<Args>) => Promise<PluginResult>
type HookStep = Record<string, StepCall<DefaultArgs>>
export type HookStepsNames = 'check' | 'pre' | 'main' | 'post' | 'revert'
export type Hook<E extends DefaultArgs, V extends DefaultArgs> = {
  uniquePlugin?: string, // if plugin register on it no other one can register on it
  execute: (args: E) => Promise<HookResult<E>>,
  validate: (args: V) => Promise<HookResult<V>>,
  apis: Record<string, (args: E| V) => PluginApi>
} & Record<HookStepsNames, HookStep>
export type HookList<E extends DefaultArgs, V extends DefaultArgs> = Record<keyof typeof hooks, Hook<E, V>>

const executeStep = async <Args extends DefaultArgs>(step: HookStep, payload: HookPayload<Args>) => {
  const names = Object.keys(step)
  const fns = names.map(name => step[name](payload))
  const results = await Promise.all(fns)
  names.forEach((name, index) => {
    if (results[index].status.result === 'KO') {
      payload.failed = Array.isArray(payload.failed)
        ? [...payload.failed, name]
        : [name]
    }
    payload.results[name] = results[index]
  })
  return payload
}

export const createHook = <E extends DefaultArgs, V extends DefaultArgs>(unique = false) => {
  const check: HookStep = {}
  const pre: HookStep = {}
  const main: HookStep = {}
  const post: HookStep = {}
  const revert: HookStep = {}
  const apis: Record<string, (args: E| V) => PluginApi> = {
  }
  const execute = async (args: E): Promise<HookResult<E>> => {
    const payloadApis: HookPayloadApis<E | V> = {}
    Object.entries(apis).forEach(([pluginName, apiFn]) => {
      payloadApis[pluginName] = apiFn(args)
    })
    let payload: HookPayload<E> = {
      failed: false,
      args,
      results: {},
      apis: payloadApis,
    }

    const steps = [pre, main, post]
    for (const step of steps) {
      payload = await executeStep(step, payload)
      if (payload.failed) {
        payload = await executeStep(revert, payload)
        break
      }
    }
    return {
      args: payload.args,
      results: payload.results,
      failed: payload.failed,
    }
  }

  const validate = async (args: V): Promise<HookResult<V>> => {
    const payloadApis: HookPayloadApis<E | V> = {}
    Object.entries(apis).forEach(([pluginName, apiFn]) => {
      payloadApis[pluginName] = apiFn(args)
    })
    const payload: HookPayload<V> = { failed: false, args, results: {}, apis: payloadApis }

    const result = await executeStep(check, payload)
    return {
      args: result.args,
      results: result.results,
      failed: result.failed,
    }
  }
  const hook: Hook<E, V> = {
    apis,
    check,
    pre,
    main,
    post,
    revert,
    execute,
    validate,
  }
  if (unique) {
    hook.uniquePlugin = ''
  }
  return hook
}
