import { readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import url from 'url'
import { isCI, isInt, isProd } from '../utils/env.js'

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
  const revert = {}

  const execute = async (args) => {
    let payload = { args }

    for (const step of [check, pre, main, post, save]) {
      payload = await executeStep(step, payload)
      if (payload.failed) {
        payload = await executeStep(revert, payload)
        break
      }
    }

    return payload
  }

  return {
    check,
    pre,
    main,
    post,
    save,
    revert,
    execute,
  }
}

const initCorePlugins = async () => {
  const hooks = {
    checkServices: createHook(),

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
      console.warn({
        message: `Plugin ${name} tried to register on an unknown hook ${hook}`,
      })
      return
    }
    if (hook === 'checkServices' && step !== 'check') {
      console.warn({
        message: `Plugin ${name} tried to register on 'checkServices' hook at ${step} which is invalid`,
      })
      return
    }
    hooks[hook][step][name] = fn
    console.warn(`Plugin ${name} registered at ${hook}:${step}`)
  }
  const unregister = (name, hook, step = 'main') => {
    delete hooks[hook][step][name]
  }
  const pluginManager = {
    hooks,
    register,
    unregister,
  }

  if ((isInt || isProd) && !isCI) {
    const { init: gitlabInit } = await import('./core/gitlab/init.js')
    const { init: harborInit } = await import('./core/harbor/init.js')
    const { init: keycloakInit } = await import('./core/keycloak/init.js')
    const { init: kubernetesInit } = await import('./core/kubernetes/init.js')
    const { init: argoInit } = await import('./core/argo/init.js')
    const { init: nexusInit } = await import('./core/nexus/init.js')
    const { init: sonarqubeInit } = await import('./core/sonarqube/init.js')
    const { init: vaultInit } = await import('./core/vault/init.js')

    gitlabInit(register)
    harborInit(register)
    keycloakInit(register)
    kubernetesInit(register)
    argoInit(register)
    nexusInit(register)
    sonarqubeInit(register)
    vaultInit(register)
  }

  return pluginManager
}

const initExternalPlugins = async (pluginManager) => {
  const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
  try {
    const pluginDir = resolve(__dirname, 'external')
    const plugins = readdirSync(resolve(__dirname, 'external'))
    for (const plugin of plugins) {
      if (existsSync(resolve(__dirname, `external/${plugin}/init.js`))) {
        const myPlugin = await import(`${pluginDir}/${plugin}/init.js`)
        myPlugin.init(pluginManager.register)
      } else {
        console.warn(`ignoring ${plugin}, ${plugin}/init.js does not exist`)
      }
    }
  } catch (err) {
    console.error(err)
  }
}

const pluginManager = await initCorePlugins()
if ((isInt || isProd) && !isCI) { // execute only when in real prod env and local dev integration
  await initExternalPlugins(pluginManager)
}

const hooksFns = {}
Object.entries(pluginManager.hooks).forEach(([key, val]) => {
  hooksFns[key] = val.execute
})

export default hooksFns
