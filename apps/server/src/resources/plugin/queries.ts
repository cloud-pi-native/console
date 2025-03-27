import type { ConfigRecordsInput } from './business.js'
import prisma from '@/prisma.js'

// CONFIG
export const getAdminPlugin = prisma.adminPlugin.findMany

export async function savePluginsConfig(records: ConfigRecordsInput) {
  for (const { pluginName, key, value } of records) {
    await prisma.adminPlugin.upsert({
      create: {
        pluginName,
        key,
        value: String(value),
      },
      update: {
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
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
