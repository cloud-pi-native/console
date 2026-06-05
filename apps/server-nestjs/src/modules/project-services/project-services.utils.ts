import type { PluginsUpdateBody, ServiceUrl } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import type { PrismaService } from '../infrastructure/database/prisma.service'

export interface PluginRecord {
  pluginName: string
  key: string
  value: string
}

export const projectServicesProjectSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  clusters: {
    include: {
      zone: true,
    },
  },
  environments: true,
} satisfies Prisma.ProjectSelect

export const publicClusterSelect = {
  include: {
    zone: true,
  },
} satisfies Prisma.ClusterDefaultArgs

export function dbToObj(records: PluginRecord[]): PluginsUpdateBody {
  const obj: PluginsUpdateBody = {}
  for (const record of records) {
    if (!obj[record.pluginName]) obj[record.pluginName] = {}
    obj[record.pluginName][record.key] = record.value
  }
  return obj
}

export function objToDb(obj: PluginsUpdateBody): PluginRecord[] {
  return Object.entries(obj)
    .flatMap(([pluginName, values]) => Object.entries(values)
      .map(([key, value]) => ({ pluginName, key, value })))
}

export function normalizeServiceUrls(toResponse: unknown): ServiceUrl[] {
  if (Array.isArray(toResponse)) {
    return toResponse.map(res => ({ name: res.title ?? '', description: res.description ?? '', to: res.to }))
  }

  if (typeof toResponse === 'string') {
    return [{ to: toResponse, name: '' }]
  }

  if (toResponse) {
    return [{ name: (toResponse as { title?: string }).title ?? '', to: (toResponse as { to: string }).to }]
  }

  return []
}

export async function saveProjectStore(records: PluginRecord[], projectId: string, prisma: PrismaService) {
  for (const { pluginName, key, value } of records) {
    if (value === null) {
      await prisma.projectPlugin.delete({
        where: {
          projectId_pluginName_key: {
            projectId,
            pluginName,
            key,
          },
        },
      })
    } else {
      await prisma.projectPlugin.upsert({
        create: {
          pluginName,
          projectId,
          key,
          value: value.toString(),
        },
        update: {
          key,
          value: value.toString(),
          pluginName,
        },
        where: {
          projectId_pluginName_key: {
            projectId,
            pluginName,
            key,
          },
        },
      })
    }
  }
}
