import type { Monitor } from '@cpn-console/shared'
import type { PluginApi } from './utils/utils'
import { objectEntries } from './utils/utils'
import * as hooks from './hooks/index'
import { type ServiceInfos, servicesInfos } from './services'
import type { HookStepsNames, StepCall } from './hooks/hook'
import { addPlugin, editStrippers } from './config'

export * from './utils/logger'

export type HookChoice = keyof typeof hooks

type ExecArgs<Choice extends HookChoice> = Parameters<typeof hooks[Choice]['execute']>[0]

export type PluginsFunctions = Partial<{
  [C in HookChoice]: {
    steps?: Partial<{
      [S in HookStepsNames]: StepCall<ExecArgs<C>>
    }>
    api?: (args: ExecArgs<C>) => PluginApi
  }
}>

export interface Plugin {
  infos: ServiceInfos
  subscribedHooks: PluginsFunctions
  monitor?: Monitor
  start?: (options: unknown) => void
}

export type RegisterFn = (plugin: Plugin) => void
export type UnregisterFn = (name: Plugin['infos']['name']) => void
export interface PluginManager {
  servicesInfos: Record<string, ServiceInfos>
  register: RegisterFn
  unregister: UnregisterFn
}

export interface PluginManagerOptions {
  startPlugins?: boolean
  mockMonitoring?: boolean
  mockHooks?: boolean
  mockExternalServices?: boolean
  externalDir?: string
}

let config: PluginManagerOptions
function pluginManager(options: PluginManagerOptions): PluginManager {
  config = options
  const register: RegisterFn = (plugin: Plugin) => {
    if (plugin.infos.config) {
      addPlugin(plugin.infos.name, plugin.infos.config, editStrippers)
    }

    if (plugin.infos.to && config.mockExternalServices)
      plugin.infos.to = () => [{ name: 'Lien', to: 'https://theuselessweb.com/' }]
    if (plugin.start && options.startPlugins)
      plugin.start({})
    const message: string[] = []
    if (plugin.monitor && config.mockMonitoring) {
      plugin.monitor.monitorFn = async (instance: Monitor) => instance.lastStatus
    }
    if (plugin.monitor)
      plugin.monitor.refresh()
    servicesInfos[plugin.infos.name] = {
      ...plugin.infos,
      monitor: plugin.monitor,
    }
    const subscribedHooks = plugin.subscribedHooks
    const name = plugin.infos.name

    if (!config.mockHooks) {
      for (const [hook, functions] of objectEntries(subscribedHooks)) {
        if (!(hook in hooks)) {
          console.warn({
            message: `Plugin ${name} tried to register on an unknown hook ${hook}`,
          })
          continue
        }
        if (functions?.api) {
          hooks[hook].apis[name] = functions.api
        }
        for (const [step, fn] of objectEntries(functions?.steps ?? {})) {
          if (fn === undefined)
            continue
          if (hook === 'checkServices' && step !== 'check') {
            console.warn({
              message: `Plugin ${name} tried to register on 'checkServices' hook at ${step} which is invalid`,
            })
            continue
          }

          if ('uniquePlugin' in hooks[hook] && hooks[hook]?.uniquePlugin !== '' && hooks[hook]?.uniquePlugin !== name) {
            console.warn({ message: `Plugin ${name} cannot register on '${hook}', hook is already registered on by ${hooks[hook].uniquePlugin}` })
            continue
          }
          // @ts-ignore
          hooks[hook].steps[step][name] = fn
          message.push(`${hook}:${step}`)
        }
      }
    }
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`Plugin ${name} registered${message.length ? ' at ' : ''}${message.join(' ')}`)
    }
  }

  const unregister: UnregisterFn = (name) => {
    delete servicesInfos[name]

    Object.values(hooks).forEach((hook) => {
      delete hook.steps.pre[name]
      delete hook.steps.main[name]
      delete hook.steps.post[name]
      delete hook.steps.revert[name]
      delete hook.apis[name]
    })
  }

  return {
    servicesInfos,
    register,
    unregister,
  }
}

export {
  pluginManager,
  hooks,
}

export * from './services'
export * from './utils/crypto'
export * from './hooks/index'
export * from './hooks/hook'
export * from './utils/utils'
export * from './config'
