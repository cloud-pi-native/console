import type { ConfigRecords } from './business'
import prisma from '@/prisma'

// CONFIG
export const getAdminPlugin = prisma.adminPlugin.findMany

export async function savePluginsConfig(records: ConfigRecords) {
  for (const { pluginName, key, value } of records) {
    await prisma.adminPlugin.upsert({
      create: {
        pluginName,
        key,
        value: String(value),
      },
      update: {
        key,
        value: String(value),
        pluginName,
      },
      where: {
        pluginName_key: {
          pluginName,
          key,
        },
      },
    })
  }
}
