import { readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import url from 'url'
import { type FastifyInstance } from 'fastify/types/instance.js'
import { objectEntries, objectKeys } from '@/utils/type.js'
import * as hooks from './hooks/index.js'
import { type PluginsFunctions } from './hooks/hook.js'
import { disabledPlugins, isCI, isInt, isProd } from '@/utils/env.js'
import { type ServiceInfos, servicesInfos } from './services.js'
export type RegisterFn = (name: string, subscribedHooks: PluginsFunctions) => void
export type PluginManager = Promise<{
  hookList: typeof hooks,
  servicesInfos: Record<string, ServiceInfos>
  register: RegisterFn
}>

const initPluginManager = async (app: FastifyInstance): PluginManager => {
  const register: RegisterFn = (name, subscribedHooks) => {
    const message = []
    for (const [hook, steps] of objectEntries(subscribedHooks)) {
      if (!(hook in hooks) && hook !== 'all') {
        app.log.warn({
          message: `Plugin ${name} tried to register on an unknown hook ${hook}`,
        })
        continue
      }

      for (const [step, fn] of objectEntries(steps)) {
        if (hook === 'checkServices' && step !== 'check') {
          app.log.warn({
            message: `Plugin ${name} tried to register on 'checkServices' hook at ${step} which is invalid`,
          })
          continue
        }

        if (hook === 'all') {
          for (const hook of objectKeys(hooks)) {
            if (!('uniquePlugin' in hooks[hook])) {
              hooks[hook][step][name] = fn
            }
          }
          message.push(`*:${step}`)
        } else {
          if ('uniquePlugin' in hooks[hook] && hooks[hook]?.uniquePlugin !== '' && hooks[hook]?.uniquePlugin !== name) {
            app.log.warn({ message: `Plugin ${name} cannot register on 'fetchOrganizations', hook is already registered on` })
            continue
          }
          hooks[hook][step][name] = fn
          message.push(`${hook}:${step}`)
        }
      }
    }
    app.log.warn(`Plugin ${name} registered at ${message.join(' ')}`)
  }

  return {
    hookList: hooks,
    servicesInfos,
    register,
  }
}

const fileExtension = isProd ? 'js' : 'ts'

const importPlugin = async (pluginManager: Awaited<PluginManager>, name: string, absolutePath: string) => {
  try {
    const infos = await import(`${absolutePath}/infos.${fileExtension}`) as { default: ServiceInfos}
    if (disabledPlugins.includes(infos.default.name)) return

    if ((isInt || isProd) && !isCI) { // execute only when in real prod env and local dev integration
      const { init } = await import(`${absolutePath}/init.${fileExtension}`)
      init(pluginManager.register)
    }
    servicesInfos[name] = infos.default
  } catch (error) {
  }
}

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export const initCorePlugins = async (pluginManager: Awaited<PluginManager>, _app: FastifyInstance) => {
  const corePlugins = ['gitlab', 'harbor', 'keycloak', 'kubernetes', 'argo', 'nexus', 'sonarqube', 'vault']
  for (const pluginName of corePlugins) {
    const pluginDir = resolve(__dirname, `core/${pluginName}`)
    await importPlugin(pluginManager, pluginName, pluginDir)
  }
}

export const initExternalPlugins = async (pluginManager: Awaited<PluginManager>, app: FastifyInstance) => {
  try {
    const pluginDir = resolve(__dirname, 'external')
    if (!existsSync(pluginDir)) {
      app.log.info(`Directory ${pluginDir} does not exist, skipping import of external plugins`)
      return
    }
    const plugins = readdirSync(pluginDir)
    for (const pluginName of plugins) {
      const pluginDir = resolve(__dirname, `external/${pluginName}`)
      await importPlugin(pluginManager, pluginName, pluginDir)
    }
  } catch (err) {
    app.log.error(err)
  }
}

export {
  initPluginManager,
  hooks,
}
