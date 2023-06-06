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
    let payload = { failed: false, args }
    const steps = [pre, main, post, save]
    for (const step of steps) {
      payload = await executeStep(step, payload)
      if (payload.failed) {
        payload = await executeStep(revert, payload)
        break
      }
    }
    return payload
  }

  const validate = async (args) => {
    const payload = { failed: false, args }
    return executeStep(check, payload)
  }

  return {
    check,
    pre,
    main,
    post,
    save,
    revert,
    execute,
    validate,
  }
}

const fetchOrganizationRegistration = {
  isRegisteredOn: false,
  plugin: undefined,
}

const initPluginManager = async () => {
  const hooks = {
    checkServices: createHook(),

    fetchOrganizations: createHook(),

    addCluster: createHook(),
    updateCluster: createHook(),
    deleteCluster: createHook(),
    testCluster: createHook(),
    enableCluster: createHook(),
    disableCluster: createHook(),
    linkProjectCluster: createHook(),
    unlinkProjectCluster: createHook(),

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
    if (hook === 'fetchOrganizations' &&
      fetchOrganizationRegistration.isRegisteredOn &&
      fetchOrganizationRegistration.plugin !== name) {
      console.warn({
        message: `Plugin ${name} cannot register on 'fetchOrganizations', hook is already registered on`,
      })
      return
    }
    if (hook === 'fetchOrganizations' &&
      !fetchOrganizationRegistration.isRegisteredOn) {
      fetchOrganizationRegistration.isRegisteredOn = true
      fetchOrganizationRegistration.plugin = name
    }
    hooks[hook][step][name] = fn
    console.warn(`Plugin ${name} registered at ${hook}:${step}`)
  }

  const unregister = (name, hook, step = 'main') => {
    delete hooks[hook][step][name]
  }

  return {
    hooks,
    register,
    unregister,
  }
}

export const initCorePlugins = async (pluginManager) => {
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

const initExternalPlugins = async (pluginManager) => {
  const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
  try {
    const pluginDir = resolve(__dirname, 'external')
    if (!existsSync(pluginDir)) {
      console.log(`Directory ${pluginDir} does not exist, skipping import of external plugins`)
      return
    }
    const plugins = readdirSync(pluginDir)
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

const pluginManager = await initPluginManager()

if ((isInt || isProd) && !isCI) { // execute only when in real prod env and local dev integration
  await initCorePlugins(pluginManager)
  await initExternalPlugins(pluginManager)
}

const hooksHandlers = {}

Object.entries(pluginManager.hooks).forEach(([key, val]) => {
  hooksHandlers[key] = { execute: val.execute, validate: val.validate }
})

export default hooksHandlers
