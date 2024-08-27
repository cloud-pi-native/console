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

export const getAdminPlugin = prisma.adminPlugin.findMany

export async function saveProjectStore(records: ConfigRecords, projectId: Project['id']) {
  for (const { pluginName, key, value } of records) {
    await prisma.projectPlugin.upsert({
      create: {
        pluginName,
        projectId,
        key,
        value: String(value),
      },
      update: {
        key,
        value: String(value),
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
