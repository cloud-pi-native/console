import type { Prisma } from '@prisma/client'

const adminPluginSelect = {
  pluginName: true,
  key: true,
  value: true,
} satisfies Prisma.AdminPluginSelect

export function listAdminPluginConfig(tx: Prisma.TransactionClient) {
  return tx.adminPlugin.findMany({ select: adminPluginSelect })
}

export function upsertAdminPluginConfig(tx: Prisma.TransactionClient, pluginName: string, key: string, value: string) {
  return tx.adminPlugin.upsert({
    create: { pluginName, key, value },
    update: { value },
    where: { pluginName_key: { pluginName, key } },
  })
}
