import type { Project } from '@prisma/client'
import type { ConfigRecords } from './business.js'
import prisma from '@/prisma.js'

// CONFIG
export function getProjectStore(projectId: Project['id']) {
  return prisma.projectPlugin.findMany({
    where: { projectId },
    select: {
      key: true,
      pluginName: true,
      value: true,
    },
  })
}

export function getAdminPlugin(pluginName?: string) {
  return prisma.adminPlugin.findMany({ where: { pluginName } })
}

export async function saveProjectStore(records: ConfigRecords, projectId: Project['id']) {
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
