import type { Prisma } from '@prisma/client'

export const projectSlugSelect = {
  slug: true,
} satisfies Prisma.ProjectSelect

export type ProjectSlug = Prisma.ProjectGetPayload<{
  select: typeof projectSlugSelect
}>

export function getProjectSlug(tx: Prisma.TransactionClient, projectId: string) {
  return tx.project.findUnique({ where: { id: projectId }, select: projectSlugSelect })
}

export const projectPluginsSelect = {
  plugins: {
    select: {
      pluginName: true,
      key: true,
      value: true,
    },
  },
} satisfies Prisma.ProjectSelect

export type ProjectPlugins = Prisma.ProjectGetPayload<{
  select: typeof projectPluginsSelect
}>

export function getProjectPlugins(tx: Prisma.TransactionClient, projectId: string) {
  return tx.project.findUnique({ where: { id: projectId }, select: projectPluginsSelect })
}

export const adminPluginSelect = {
  pluginName: true,
  key: true,
  value: true,
} satisfies Prisma.AdminPluginSelect

export type AdminPlugin = Prisma.AdminPluginGetPayload<{
  select: typeof adminPluginSelect
}>

export function getAdminPlugin(tx: Prisma.TransactionClient, pluginName: string, key: string) {
  return tx.adminPlugin.findUnique({
    where: { pluginName_key: { pluginName, key } },
    select: adminPluginSelect,
  })
}
