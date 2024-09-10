import path from 'node:path'
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmdirSync, statSync, unlinkSync } from 'node:fs'
import axios from 'axios'
// @ts-expect-error TS7016
import decompress from 'decompress'
// @ts-expect-error TS7016
import semver from 'semver'
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
import { pluginsDir, pluginsSources } from './utils/env.js'

async function downloadZip(url: string, savePath: string) {
  // axios image download with response type "stream"
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'stream',
  })

  // pipe the result stream into a file on disc
  response.data.pipe(createWriteStream(savePath))

  // return a promise and resolve when download finishes
  return new Promise<string>((resolve, reject) => {
    response.data.on('end', () => {
      resolve(savePath)
    })

    response.data.on('error', () => {
      // @ts-ignore
      reject(new Error(`Unable to download archive`))
    })
  })
}

const hooksPackageJsonPath = path.join(
  path.dirname(
    path.dirname(
      require.resolve('@cpn-console/hooks'),
    ),
  ),
  'package.json',
)

const hooksPackageVersion = JSON.parse(readFileSync(hooksPackageJsonPath, 'utf-8')).version // 2.3.2

async function importZipPuglin(zipUrl: string, name: string, pluginsArchiveDir: string) {
  const zipPath = path.join(pluginsArchiveDir, `${name}.zip`)
  await downloadZip(zipUrl, zipPath)
  const pluginPath = path.join(pluginsDir, name)
  await decompress(zipPath, pluginPath)
}

async function getMappedVersion(mapperUrl: string) {
  const mapper = await axios.get(mapperUrl)
  let url
  if (mapper.status !== 200) {
    throw new Error(`unable to fetch mapper ${mapperUrl}`)
  }
  for (const [range, pluginUrl] of Object.entries(mapper.data)) {
    if (semver.satisfies(hooksPackageVersion, range)) {
      url = pluginUrl
      break
    }
  }

  if (!url) {
    throw new Error('impossible de trouver une version correspondante')
  }
  return url as string
}

export async function fetchExternalPlugins(pluginUrls: string[]) {
  if (!pluginUrls.length) return

  const pluginsArchiveDir = mkdtempSync('/tmp/plugins')

  if (!existsSync(pluginsDir)) {
    mkdirSync(pluginsDir)
  }

  let i = 0
  for (let pluginUrl of pluginUrls) {
    if (pluginUrl.startsWith('!')) {
      console.log('ignoring', pluginUrl)
      continue
    }
    i++
    if (pluginUrl.endsWith('.json')) {
      pluginUrl = await getMappedVersion(pluginUrl)
    }
    await importZipPuglin(pluginUrl, `fetched-${i.toString()}`, pluginsArchiveDir)
  }
  const fetchedPlugins = readdirSync(pluginsArchiveDir)
  for (const file of fetchedPlugins) {
    unlinkSync(path.join(pluginsArchiveDir, file))
  }
  rmdirSync(pluginsArchiveDir)
}

export async function initPm() {
  const fetchPromise = fetchExternalPlugins(pluginsSources.split(','))
  const pm = pluginManager(pluginManagerOptions)
  pm.register(argo)
  pm.register(gitlab)
  pm.register(harbor)
  pm.register(keycloak)
  pm.register(kubernetes)
  pm.register(nexus)
  pm.register(sonarqube)
  pm.register(vault)

  await fetchPromise
  if (!statSync(pluginsDir, {
    throwIfNoEntry: false,
  })) {
    return pm
  }
  for (const dirName of readdirSync(pluginsDir)) {
    const moduleAbsPath = `${pluginsDir}/${dirName}`
    try {
      statSync(`${moduleAbsPath}/package.json`)
      const pkg = await import(`${moduleAbsPath}/package.json`, { assert: { type: 'json' } })
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
