import {
  type PluginsUpdateBody,
  adminGroupPath,
} from '@cpn-console/shared'
import {
  getAdminPlugin,
} from '@/resources/queries-index.js'
import { ForbiddenError } from '@/utils/errors.js'
import type { KeycloakPayload } from 'fastify-keycloak-adapter'
import { editStrippers, populatePluginManifests, servicesInfos } from '@cpn-console/hooks'
import { savePluginsConfig } from './queries.js'

export type ConfigRecords = {
  key: string
  pluginName: string
  value: string
}[]

export const objToDb = (obj: PluginsUpdateBody): ConfigRecords => Object.entries(obj)
  .map(([pluginName, values]) => Object.entries(values)
    .map(([key, value]) => ({ pluginName, key, value })))
  .flat()

export const getPluginsConfig = async (requestor: KeycloakPayload) => {
  // Pré-requis
  const isAdmin = requestor.groups?.includes(adminGroupPath)

  if (!isAdmin) {
    throw new ForbiddenError('Vous n\'êtes pas admin')
  }

  const globalConfig = await getAdminPlugin()

  return Object.values(servicesInfos).map(({ name, title, imgSrc }) => {
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
    return { imgSrc, title, name, manifest: manifest.global ?? [] }
  }).filter(plugin => plugin.manifest.length > 0)
}

export const updatePluginConfig = async (data: PluginsUpdateBody, requestor: KeycloakPayload) => {
  // Pré-requis
  const isAdmin = requestor.groups?.includes(adminGroupPath)
  if (!isAdmin) {
    throw new ForbiddenError('Vous n\'êtes pas admin')
  }

  const parsedData = editStrippers.global.safeParse(data)
  if (!parsedData.success) return
  const records = objToDb(parsedData.data)
  await savePluginsConfig(records)
}
