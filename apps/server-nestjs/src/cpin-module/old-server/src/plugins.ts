import { readdirSync, statSync } from 'node:fs'
import { type Plugin, pluginManager } from '@cpn-console/hooks'
import { plugin as argo } from '@cpn-console/argocd-plugin'
import { plugin as gitlab } from '@cpn-console/gitlab-plugin'
import { plugin as harbor } from '@cpn-console/harbor-plugin'
import { plugin as keycloak } from '@cpn-console/keycloak-plugin'
import { plugin as kubernetes } from '@cpn-console/kubernetes-plugin'
import { plugin as nexus } from '@cpn-console/nexus-plugin'
import { plugin as sonarqube } from '@cpn-console/sonarqube-plugin'
import { plugin as vault } from '@cpn-console/vault-plugin'
import { pluginManagerOptions } from './utils/plugins.js'
import { pluginsDir } from './utils/env.js'

export async function initPm() {
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
  })) {
    return pm
  }
  for (const dirName of readdirSync(pluginsDir)) {
    const moduleAbsPath = `${pluginsDir}/${dirName}`
    try {
      statSync(`${moduleAbsPath}/package.json`)
      const pkg = await import(`${moduleAbsPath}/package.json`, { with: { type: 'json' } })
      const entrypoint = pkg.default.module || pkg.default.main
      if (!entrypoint) throw new Error(`No entrypoint found in package.json : ${pkg.default.name}`)
      const { plugin } = await import(`${moduleAbsPath}/${entrypoint}`) as { plugin: Plugin }
      pm.register(plugin)
    } catch (error) {
      console.error(`Could not import module ${moduleAbsPath}`)
      console.error(error.stack)
    }
  }

  return pm
}
