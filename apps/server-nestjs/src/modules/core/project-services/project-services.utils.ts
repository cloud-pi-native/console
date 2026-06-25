import type { ServiceInfos } from '@cpn-console/hooks'
import type { PermissionTarget, PluginConfig, PluginsUpdateBody, ServiceUrl } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import type { PrismaService } from '../../infrastructure/database/prisma.service'
import { editStrippersGenerator } from '@cpn-console/hooks'
import { atomicValidators, DEFAULT } from '@cpn-console/shared'
import { z } from 'zod'

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
  environments: {
    include: {
      cluster: {
        include: {
          zone: true,
        },
      },
    },
  },
} satisfies Prisma.ProjectSelect

export const publicClusterSelect = {
  include: {
    zone: true,
  },
} satisfies Prisma.ClusterDefaultArgs

export function generatePluginsUpdateBody(records: PluginRecord[]): PluginsUpdateBody {
  const obj: PluginsUpdateBody = {}
  for (const record of records) {
    if (!obj[record.pluginName]) obj[record.pluginName] = {}
    obj[record.pluginName][record.key] = record.value
  }
  return obj
}

export function parsePluginsUpdateBody(obj: PluginsUpdateBody): PluginRecord[] {
  return Object.entries(obj)
    .flatMap(([pluginName, values]) => Object.entries(values)
      .map(([key, value]) => ({ pluginName, key, value })))
}

export function buildProjectEditStrippers(services: ServiceInfos[]) {
  const project = {
    user: z.object({}),
    admin: z.object({}),
  }
  let global = z.object({})

  for (const service of services) {
    if (!service.config) continue
    const editZod = editStrippersGenerator.parse(service.config)
    global = global.merge(z.object({ [service.name]: editZod.global.default({}) }))
    project.admin = project.admin.merge(z.object({ [service.name]: editZod.project.admin.default({}) }))
    project.user = project.user.merge(z.object({ [service.name]: editZod.project.user.default({}) }))
  }

  return { project, global }
}

interface ServiceManifestParams {
  service: ServiceInfos
  data: { project?: PluginRecord[], global?: PluginRecord[] }
  permissionTarget: PermissionTarget
  select: Partial<Record<keyof PluginConfig, boolean>>
}

export function populateServiceManifest({ service, data, select, permissionTarget }: ServiceManifestParams): Partial<PluginConfig> {
  const manifest = structuredClone(service.config)

  const selected: Partial<PluginConfig> = {}
  for (const [scope] of Object.entries(select).filter(([_scope, bool]) => bool)) {
    if (!manifest?.[scope]) continue
    selected[scope] = manifest[scope].filter(item => item.permissions[permissionTarget].read || item.permissions[permissionTarget].write).map((item) => {
      const row = data[scope]?.find(candidate => candidate.pluginName === service.name && candidate.key === item.key)
      if (item.kind === 'switch') {
        const value = atomicValidators.switch.safeParse(row?.value)
        item.value = value.success ? value.data : DEFAULT
      } else {
        item.value = z.coerce.string().parse(row?.value ?? item.value ?? '')
      }
      return item
    })
  }
  return selected
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
