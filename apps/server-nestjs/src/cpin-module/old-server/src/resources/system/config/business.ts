import type {
  PluginsUpdateBody,
} from '@cpn-console/shared'
import { editStrippers, populatePluginManifests, servicesInfos } from '@cpn-console/hooks'
import {
  getAdminPlugin,
  savePluginsConfig,
} from './queries.js'
import { BadRequest400 } from '@old-server/utils/errors.js'

export type ConfigRecords = {
  key: string
  pluginName: string
  value: string
}[]

export function objToDb(obj: PluginsUpdateBody): ConfigRecords {
  return Object.entries(obj)
    .map(([pluginName, values]) => Object.entries(values)
      .map(([key, value]) => ({ pluginName, key, value })))
    .flat()
}

export async function getPluginsConfig() {
  const globalConfig = await getAdminPlugin()

  return Object.values(servicesInfos).map(({ name, title, imgSrc, description }) => {
    const manifest = populatePluginManifests({
      data: {
        global: globalConfig,
      },
      permissionTarget: 'admin',
      pluginName: name,
      select: {
        global: true,
        project: false,
      },
    })
    return { imgSrc, title, name, manifest: manifest.global ?? [], description }
  }).filter(plugin => plugin.manifest.length > 0)
}

export async function updatePluginConfig(data: PluginsUpdateBody) {
  const parsedData = editStrippers.global.safeParse(data)
  if (!parsedData.success) return new BadRequest400(parsedData.error.message)
  const records = objToDb(parsedData.data)

  await savePluginsConfig(records)
  return null
}
