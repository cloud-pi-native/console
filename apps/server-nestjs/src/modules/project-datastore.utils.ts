import type { Prisma } from '@prisma/client'
import { ENABLED } from '@cpn-console/shared'

export const AUTO_SYNC_PLUGIN_KEY = 'autoSync'

export type ProjectAutoSyncWhereInput = {
  AND: [
    {
      plugins: {
        some: {
          pluginName: string
          key: string
          value: string
        }
      }
    },
    {
      suspended: false
    }
  ]
}

export function buildProjectAutoSyncWhere(pluginName: string): ProjectAutoSyncWhereInput {
  return {
    AND: [
      {
        plugins: {
          some: {
            pluginName,
            key: AUTO_SYNC_PLUGIN_KEY,
            value: ENABLED,
          },
        },
      },
      {
        suspended: false,
      },
    ],
  }
}
