import type {
  PluginsUpdateBody,
} from '@cpn-console/shared'
import type { ServiceInfos } from '@cpn-console/hooks'
import { editStrippers, populatePluginManifests, servicesInfos } from '@cpn-console/hooks'
import {
  getAdminPlugin,
  savePluginsConfig,
} from './queries.js'
import { BadRequest400 } from '@/utils/errors.js'
import prisma from '@/prisma.js'
import type { AdminPlugin } from '@prisma/client'

type ConfigInput = string | string[] | Record<string, string>

export type ConfigRecordsInput = {
  key: string
  pluginName: string
  value: ConfigInput
}[]

export type ConfigRecordsDb = {
  key: string
  pluginName: string
  value: string
}[]

export function objToDb(obj: PluginsUpdateBody): ConfigRecordsInput {
  return Object.entries(obj)
    .map(([pluginName, values]) => Object.entries(values)
      .map(([key, value]) => ({ pluginName, key, value })))
    .flat()
}

function makePluginConfig({ name, title, imgSrc, description }: ServiceInfos, globalConfig: AdminPlugin[]) {
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
}

export async function listServices() {
  return Object.values(servicesInfos)
}

export async function getPluginsConfig() {
  const globalConfig = await getAdminPlugin()

  return Object.keys(servicesInfos).map(pluginName => makePluginConfig(servicesInfos[pluginName], globalConfig)).filter(plugin => plugin.manifest.length > 0)
}

export async function getPluginConfig(pluginName: string) {
  const globalConfig = await getAdminPlugin()

  return makePluginConfig(servicesInfos[pluginName], globalConfig)
}

export async function getPluginReport(pluginName: string) {
  return prisma.pluginReport.findUnique({ where: { pluginName } })
}

export async function deletePluginReport(pluginName: string) {
  return prisma.pluginReport.delete({ where: { pluginName } })
}

export async function updatePluginConfig(data: PluginsUpdateBody) {
  const parsedData = editStrippers.global.safeParse(data)
  if (!parsedData.success) return new BadRequest400(parsedData.error.message)
  const records = objToDb(parsedData.data)

  await savePluginsConfig(records)
  return null
}
