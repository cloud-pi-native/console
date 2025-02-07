import prisma from '@/prisma.js'
import type { HostFunctions } from '@cpn-console/hooks/types/utils/host-functions.js'
import { uuid } from './queries-tools.js'
import { getAdminPlugin } from '@/resources/queries-index.js'
import { dbToObj } from '@/resources/project-service/business.js'
import { formatClusterInfos } from './hook-wrapper.js'

export const hostFunctions: HostFunctions = {
  getProjectsStatus: async (idOrSlugs) => {
    return prisma.project.findMany({
      where: {
        OR: [{
          id: { in: idOrSlugs.filter(id => uuid.test(id)) },
        }, {
          slug: { in: idOrSlugs.filter(id => !uuid.test(id)) },
        }],
      },
      select: {
        id: true,
        slug: true,
        status: true,
      },
    })
  },

  getClusters: async () => {
    return prisma.cluster.findMany({ include: { kubeconfig: true, zone: true } })
      .then(clusters => clusters.map(cluster => formatClusterInfos(cluster)))
  },

  updateReport: async (pluginName: string, report: string) => {
    await prisma.pluginReport.upsert({
      where: { pluginName },
      create: { pluginName, report, updatedAt: new Date() },
      update: { report, updatedAt: new Date() },
    })
  },

  getPluginConfig: async (pluginName: string) => {
    const config = await getAdminPlugin(pluginName)
    return dbToObj(config)
  },
}
