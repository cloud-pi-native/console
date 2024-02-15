import { PluginApi, objectEntries } from './utils/utils.js'
import * as hooks from './hooks/index.js'
import { type ServiceInfos, servicesInfos } from './services.js'
import { Monitor } from '@dso-console/shared'
import { HookStepsNames, StepCall } from './hooks/hook.js'

export type HookChoice = keyof typeof hooks

type ExecArgs<Choice extends HookChoice> = Parameters<typeof hooks[Choice]['execute']>[0]
type ValidateArgs<Choice extends HookChoice> = Parameters<typeof hooks[Choice]['validate']>[0]

export type PluginsFunctions = Partial<{
  [C in HookChoice]: {
    steps?: Partial<{
      [S in HookStepsNames]: S extends 'check' ? StepCall<ValidateArgs<C>> : StepCall<ExecArgs<C>>
    }>,
    api?: (args: ExecArgs<C>) => PluginApi,
  }
}>

export type Plugin = {
  infos: ServiceInfos,
  subscribedHooks: PluginsFunctions,
  monitor?: Monitor,
  start?: (options: unknown) => void
}

export type RegisterFn = (plugin: Plugin) => void
export type UnregisterFn = (name: Plugin['infos']['name']) => void
export type PluginManager = {
  servicesInfos: Record<string, ServiceInfos>
  register: RegisterFn
  unregister: UnregisterFn
}

export type PluginManagerOptions = {
  startPlugins?: boolean
  mockMonitoring?: boolean
  mockHooks?: boolean
  mockExternalServices?: boolean
  externalDir?: string
}

let config: PluginManagerOptions
const pluginManager = (options: PluginManagerOptions): PluginManager => {
  config = options
  const register: RegisterFn = (plugin: Plugin) => {
    if (plugin.infos.to && config.mockExternalServices) plugin.infos.to = () => 'https://theuselessweb.com/'
    if (plugin.start && options.startPlugins) plugin.start({})
    const message: string[] = []
    if (plugin.monitor && config.mockMonitoring) {
      plugin.monitor.monitorFn = async (instance: Monitor) => instance.lastStatus
    }
    if (plugin.monitor) plugin.monitor.refresh()
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
          // @ts-ignore
          hooks[hook].apis[name] = functions.api
        }
        for (const [step, fn] of objectEntries(functions?.steps ?? {})) {
          if (fn === undefined) continue
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
          hooks[hook][step][name] = fn
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

    Object.values(hooks).forEach(hook => {
      delete hook.check[name]
      delete hook.pre[name]
      delete hook.main[name]
      delete hook.post[name]
      delete hook.revert[name]
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

export * from './services.js'
export * from './utils/crypto.js'
export * from './hooks/index.js'
export * from './hooks/hook.js'
export * from './utils/utils.js'
