import type { Prisma } from '@prisma/client'

export const adminPluginSelect = {
  pluginName: true,
  key: true,
  value: true,
} satisfies Prisma.AdminPluginSelect

export type AdminPluginSelect = Prisma.AdminPluginGetPayload<{
  select: typeof adminPluginSelect
}>
