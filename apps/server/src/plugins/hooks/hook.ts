import { VaultProjectApi } from '../core/vault/class.js'
import * as hooks from './index.js'

export type SecretToVault = {
  name: string,
  data: { [key: string]: any }
}
export type DefaultArgs = Record<any, any>
export type PluginResult = {
  status: { result: 'OK', message?: string } | { result: 'KO', message: string },
  vault?: SecretToVault[]
  [key: string]: any,
}

export type HookPayload<Args> = {
  sonarqube?: PluginResult
  vault?: VaultProjectApi
  args: Args,
  failed: boolean,
  plugins?: Record<string, PluginResult>
}

export type StepCall<Args> = (payload: HookPayload<Args>) => Promise<PluginResult>
type HookStep = Record<string, StepCall<DefaultArgs>>
export type HookStepsNames = 'check' | 'pre' | 'main' | 'post' | 'revert'
export type Hook<E, V> = {
  uniquePlugin?: string, // if plugin register on it no other one can register on it
  execute: (args: E) => Promise<HookPayload<E>>,
  validate: (args: V) => Promise<HookPayload<V>>,
} & Record<HookStepsNames, HookStep>
export type HookList<E, V> = Record<keyof typeof hooks, Hook<E, V>>
export type HookChoice = keyof typeof hooks | 'all'

export type PluginsFunctions = Partial<Record<
  HookChoice,
  Partial<
    Record<HookStepsNames, StepCall<DefaultArgs>>
  >
>>

const executeStep = async <Args>(step: HookStep, payload: HookPayload<Args>) => {
  const names = Object.keys(step)
  const fns = names.map(name => step[name](payload))
  const results = await Promise.all(fns)
  names.forEach((name, index) => {
    if (results[index].status.result === 'KO') payload.failed = true
    payload[name] = results[index]
  })
  return payload
}

export const createHook = <E, V>(unique = false) => {
  const check: HookStep = {}
  const pre: HookStep = {}
  const main: HookStep = {}
  const post: HookStep = {}
  const revert: HookStep = {}

  const execute = async <E>(args: E) => {
    let payload: HookPayload<E> = { failed: false, args }
    let vault: void | VaultProjectApi
    // @ts-ignore
    if (args && args.organization && args.project) {
      // @ts-ignore
      vault = new VaultProjectApi(args.organization, args.project)
    }
    const steps = [pre, main, post]
    for (const step of steps) {
      if (vault) payload.vault = vault
      payload = await executeStep(step, payload)
      if (payload.failed) {
        payload = await executeStep(revert, payload)
        break
      }
    }
    delete payload.vault
    return payload
  }

  const validate = async (args: V) => {
    const payload: HookPayload<V> = { failed: false, args }
    return executeStep(check, payload)
  }
  const hook: Hook<E, V> = {
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
