import prisma from '@/prisma.js'
import { ConfigRecords } from './business.js'

// CONFIG
export const getAdminPlugin = prisma.adminPlugin.findMany

export const savePluginsConfig = async (records: ConfigRecords) => {
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
