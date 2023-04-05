import { readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import url from 'url'
// import { init as gitlabInit } from './core/gitlab/init.js'
// import { init as harborInit } from './core/harbor/init.js'
// import { init as keycloakInit } from './core/keycloak/init.js'
// import { init as kubernetesInit } from './core/kubernetes/init.js'
// import { init as nexusInit } from './core/nexus/init.js'
// import { init as sonarqubeInit } from './core/sonarqube/init.js'
// import { init as vaultInit } from './core/vault/init.js'

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
    payload = await executeStep(check, payload)
    if (payload.failed) {
      return payload
    }
    payload = await executeStep(pre, payload)
    payload = await executeStep(main, payload)
    payload = await executeStep(post, payload)
    payload = await executeStep(save, payload)
    if (payload.failed) {
      payload = await executeStep(revert, payload)
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

const initCorePlugins = () => {
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

  // gitlabInit(register)
  // harborInit(register)
  // keycloakInit(register)
  // kubernetesInit(register)
  // nexusInit(register)
  // sonarqubeInit(register)
  // vaultInit(register)

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

const pluginManager = initCorePlugins()
await initExternalPlugins(pluginManager)

const hooks = pluginManager.hooks

export default hooks
