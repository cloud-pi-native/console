import type { Project, ProjectPlugin } from '@prisma/client'
import type {
  PermissionTarget,
  PluginsUpdateBody,
  ServiceUrl,
} from '@cpn-console/shared'
import { editStrippers, populatePluginManifests, servicesInfos } from '@cpn-console/hooks'
import type { ZoneObject } from '@cpn-console/hooks'
import {
  getAdminPlugin,
  getProjectInfosByIdOrThrow,
  getProjectStore,
  getPublicClusters,
  saveProjectStore,
} from '@/resources/queries-index.js'

export type ConfigRecords = {
  key: string
  pluginName: string
  value: string | number | null
}[]

export function dbToObj(records: Omit<ProjectPlugin, 'projectId'>[]): PluginsUpdateBody {
  const obj: PluginsUpdateBody = {}
  for (const record of records) {
    if (!obj[record.pluginName]) obj[record.pluginName] = {}
    obj[record.pluginName][record.key] = record.value
  }
  return obj
}

export function objToDb(obj: PluginsUpdateBody): ConfigRecords {
  return Object.entries(obj)
    .map(([pluginName, values]) => Object.entries(values)
      .map(([key, value]) => ({ pluginName, key, value })))
    .flat()
}

export async function getProjectServices(projectId: Project['id'], permissionTarget: PermissionTarget) {
  // Pré-requis
  const project = await getProjectInfosByIdOrThrow(projectId)

  const [projectStore, globalConfig] = await Promise.all([
    getProjectStore(projectId),
    getAdminPlugin(),
  ])
  const store = dbToObj([...projectStore, ...globalConfig])

  const publicClusters = await getPublicClusters()
  project.clusters = project.clusters.concat(publicClusters)
  const zones: Map<string, ZoneObject> = new Map() // Pour dédoublonnage des zones
  project.clusters.map(c => zones.set(c.zone.id, c.zone))

  return Object.values(servicesInfos).map(({ name, title, to, imgSrc, description }) => {
    let urls: ServiceUrl[] = []
    const toResponse = to
      ? to({
        organization: project?.organization.name,
        clusters: project.clusters,
        zones: Array.from(zones.values()),
        environments: project.environments,
        project: project.name,
        store,
      })
      : []
    if (Array.isArray(toResponse)) {
      urls = toResponse.map(res => ({ name: res.title ?? '', to: res.to }))
    } else if (typeof toResponse === 'string') {
      urls = [{ to: toResponse, name: '' }]
    } else if (toResponse) {
      urls = [{ name: toResponse.title ?? '', to: toResponse.to }]
    }
    const manifest = populatePluginManifests({
      data: {
        project: projectStore,
        global: globalConfig,
      },
      permissionTarget,
      pluginName: name,
      select: {
        global: true,
        project: true,
      },
    })
    return { imgSrc, title, name, urls, manifest, description }
  }).filter(s => s.urls.length || s.manifest.global?.length || s.manifest.project?.length)
}

export async function updateProjectServices(projectId: Project['id'], data: PluginsUpdateBody, stripperRoles: Array<'user' | 'admin'>) {
  for (const role of stripperRoles) {
    const parsedData = editStrippers.project[role].safeParse(data)
    if (!parsedData.success) continue
    await saveProjectStore(objToDb(parsedData.data), projectId)
  }
  return null
}
