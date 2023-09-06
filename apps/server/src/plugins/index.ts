import { readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import url from 'url'
import { type FastifyInstance } from 'fastify/types/instance.js'
import { objectEntries, objectKeys } from '@/utils/type.js'
import * as hooks from './hooks/index.js'
import { type PluginsFunctions } from './hooks/hook.js'
const pluginsAuthorized = process.env.plugins.split(',')

export type RegisterFn = (name: string, subscribedHooks: PluginsFunctions) => void
export type PluginManager = Promise<{ hookList: typeof hooks, register: RegisterFn }>

const initPluginManager = async (app: FastifyInstance): PluginManager => {
  const register: RegisterFn = (name: string, subscribedHooks: PluginsFunctions) => {
    if (!pluginsAuthorized.includes(name)) return
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
    register,
  }
}

export const initCorePlugins = async (pluginManager: Awaited<PluginManager>, _app: FastifyInstance) => {
  const { init: gitlabInit } = await import('./core/gitlab/init.js')
  const { init: harborInit } = await import('./core/harbor/init.js')
  const { init: keycloakInit } = await import('./core/keycloak/init.js')
  const { init: kubernetesInit } = await import('./core/kubernetes/init.js')
  const { init: argoInit } = await import('./core/argo/init.js')
  const { init: nexusInit } = await import('./core/nexus/init.js')
  const { init: sonarqubeInit } = await import('./core/sonarqube/init.js')
  const { init: vaultInit } = await import('./core/vault/init.js')

  gitlabInit(pluginManager.register)
  harborInit(pluginManager.register)
  keycloakInit(pluginManager.register)
  kubernetesInit(pluginManager.register)
  argoInit(pluginManager.register)
  nexusInit(pluginManager.register)
  sonarqubeInit(pluginManager.register)
  vaultInit(pluginManager.register)
}

export const initExternalPlugins = async (pluginManager: Awaited<PluginManager>, app: FastifyInstance) => {
  const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
  try {
    const pluginDir = resolve(__dirname, 'external')
    if (!existsSync(pluginDir)) {
      app.log.info(`Directory ${pluginDir} does not exist, skipping import of external plugins`)
      return
    }
    const plugins = readdirSync(pluginDir)
    for (const plugin of plugins) {
      if (existsSync(resolve(__dirname, `external/${plugin}/init.js`))) {
        const myPlugin = await import(`${pluginDir}/${plugin}/init.js`)
        myPlugin.init(pluginManager.register)
      } else {
        app.log.warn(`ignoring ${plugin}, ${plugin}/init.js does not exist`)
      }
    }
  } catch (err) {
    app.log.error(err)
  }
}

export {
  initPluginManager,
  hooks,
}
