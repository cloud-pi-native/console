import { type Project } from '@prisma/client'
import prisma from '@/prisma.js'
import { ConfigRecords } from './business.js'

// CONFIG
export const getProjectStore = (projectId: Project['id']) =>
  prisma.projectPlugin.findMany({
    where: { projectId },
    select: {
      key: true,
      pluginName: true,
      value: true,
    },
  })

export const getAdminPlugin = prisma.adminPlugin.findMany

export const saveProjectStore = async (records: ConfigRecords, projectId: Project['id']) => {
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
