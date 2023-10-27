import { readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import url from 'url'
import { type FastifyInstance } from 'fastify/types/instance.js'
import { objectEntries } from '@/utils/type.js'
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
      if (!(hook in hooks)) {
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

        if ('uniquePlugin' in hooks[hook] && hooks[hook]?.uniquePlugin !== '' && hooks[hook]?.uniquePlugin !== name) {
          app.log.warn({ message: `Plugin ${name} cannot register on '${hook}', hook is already registered on by ${hooks[hook].uniquePlugin}` })
          continue
        }
        hooks[hook][step][name] = fn
        message.push(`${hook}:${step}`)
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
    servicesInfos[infos.default.name] = infos.default
  } catch (error) {
  }
}

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export const initPlugins = async (pluginManager: Awaited<PluginManager>, app: FastifyInstance, baseDirName: string) => {
  try {
    const pluginDir = resolve(__dirname, baseDirName)
    if (!existsSync(pluginDir)) {
      app.log.info(`Directory ${pluginDir} does not exist, skipping import of plugins`)
      return
    }
    const plugins = readdirSync(pluginDir)
    await Promise.all(plugins.map(async pluginName => {
      const pluginDir = resolve(__dirname, `${baseDirName}/${pluginName}`)
      return importPlugin(pluginManager, pluginName, pluginDir)
    }))
  } catch (err) {
    app.log.error(err)
  }
}

export {
  initPluginManager,
  hooks,
}
