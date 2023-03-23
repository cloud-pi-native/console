// import { readdir } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import url from 'url'
import { getLogInfos } from '../utils/logger.js'
import { init as gitlabInit } from './core/gitlab/init.js'
import { init as harborInit } from './core/harbor/init.js'
import { init as keycloakInit } from './core/keycloak/init.js'
import { init as kubernetesInit } from './core/kubernetes/init.js'
import { init as nexusInit } from './core/nexus/init.js'
import { init as sonarqubeInit } from './core/sonarqube/init.js'
import { init as vaultInit } from './core/vault/init.js'

const executeStep = async (step, payload) => {
  const names = Object.keys(step)
  const fns = names.map(name => Promise.resolve(step[name](payload)))
  const results = await Promise.all(fns)
  names.forEach((name, index) => {
    if (results[index].status.result === 'KO') payload.failed = true
    payload[name] = results[index]
  })

  return payload
}

const createHook = () => {
  const check = {}
  const pre = {}
  const main = {}
  const post = {}
  const save = {}

  const execute = async (args) => {
    let payload = { args }
    payload = await executeStep(check, payload)
    if (payload.failed) {
      return payload
    }
    payload = await executeStep(pre, payload)
    payload = await executeStep(main, payload)
    payload = await executeStep(post, payload)
    payload = await executeStep(save, payload)
    return payload
  }

  return {
    check,
    pre,
    main,
    post,
    save,
    execute,
  }
}

export const initCorePlugins = (app) => {
  const hooks = {
    createProject: createHook(),
    archiveProject: createHook(),

    createRepository: createHook(),
    updateRepository: createHook(),
    deleteRepository: createHook(),

    addUserToProject: createHook(),
    updateUserProjectRole: createHook(),
    removeUserFromProject: createHook(),

    initializeEnvironment: createHook(),
    deleteEnvironment: createHook(),

    setPermission: createHook(),
    updatePermission: createHook(),
    deletePermission: createHook(),
  }
  const register = (name, hook, fn, step = 'main') => {
    if (!(hook in hooks)) {
      app.log.warn({
        ...getLogInfos(),
        message: `Plugin ${name} tried to register on an unknown hook ${hook}`,
      })
      return
    }
    hooks[hook][step][name] = fn
    app.log.warn(`Plugin ${name} registered at ${hook}:${step}`)
  }
  const unregister = (name, hook, step = 'main') => {
    delete hooks[hook][step][name]
  }
  const pluginManager = {
    hooks,
    register,
    unregister,
  }

  gitlabInit(register)
  harborInit(register)
  keycloakInit(register)
  kubernetesInit(register)
  nexusInit(register)
  sonarqubeInit(register)
  vaultInit(register)

  return pluginManager
}

export const initExternalPlugins = async (app, m) => {
  const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
  try {
    const pluginDir = resolve(__dirname, 'external')
    const plugins = readdirSync(resolve(__dirname, 'external'))
    for (const plugin of plugins) {
      const myPlugin = await import(`${pluginDir}/${plugin}/init.js`)
      myPlugin.init(m.register)
    }
  } catch (err) {
    app.log.error(err)
  }
}
