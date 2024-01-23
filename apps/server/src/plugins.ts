import { readdirSync, statSync } from 'fs'
import { type Plugin, pluginManager } from '@dso-console/hooks'
import { plugin as argo } from '@dso-console/argo-plugin'
import { plugin as gitlab } from '@dso-console/gitlab-plugin'
import { plugin as harbor } from '@dso-console/harbor-plugin'
import { plugin as keycloak } from '@dso-console/keycloak-plugin'
import { plugin as kubernetes } from '@dso-console/kubernetes-plugin'
import { plugin as nexus } from '@dso-console/nexus-plugin'
import { plugin as sonarqube } from '@dso-console/sonarqube-plugin'
import { plugin as vault } from '@dso-console/vault-plugin'
import { pluginManagerOptions } from './utils/plugins.js'
import { pluginsDir } from './utils/env.js'

export const initPm = () => {
  const pm = pluginManager(pluginManagerOptions)
  pm.register(argo)
  pm.register(gitlab)
  pm.register(harbor)
  pm.register(keycloak)
  pm.register(kubernetes)
  pm.register(nexus)
  pm.register(sonarqube)
  pm.register(vault)

  if (!statSync(pluginsDir, {
    throwIfNoEntry: false,
  })) return pm
  readdirSync(pluginsDir)
    .forEach(async dirName => {
      const moduleAbsPath = `${pluginsDir}/${dirName}`
      try {
        statSync(`${moduleAbsPath}/package.json`)
        const module = await import(moduleAbsPath) as {plugin: Plugin}
        pm.register(module.plugin)
      } catch (error) {
        console.error(`Could not import module ${moduleAbsPath}`)
        console.error(error.stack)
      }
    })

  return pm
}
