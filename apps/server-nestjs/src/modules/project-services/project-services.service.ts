import type { EnvironmentObject } from '@cpn-console/hooks'
import type { PermissionTarget, PluginsUpdateBody, ProjectService as ProjectServiceShape } from '@cpn-console/shared'
import { editStrippers, populatePluginManifests, servicesInfos } from '@cpn-console/hooks'
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import {
  dbToObj,
  normalizeServiceUrls,
  objToDb,
  projectServicesProjectSelect,
  publicClusterSelect,
  saveProjectStore,
} from './project-services.utils'

@Injectable()
export class ProjectServicesService {
  private readonly logger = new Logger(ProjectServicesService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async getProjectServices(projectId: string, permissionTarget: PermissionTarget): Promise<ProjectServiceShape[]> {
    const [project, projectStore, globalConfig, publicClusters] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: projectServicesProjectSelect,
      }),
      this.prisma.projectPlugin.findMany({
        where: { projectId },
        select: {
          key: true,
          pluginName: true,
          value: true,
        },
      }),
      this.prisma.adminPlugin.findMany({
        select: {
          key: true,
          pluginName: true,
          value: true,
        },
      }),
      this.prisma.cluster.findMany({
        where: { privacy: 'public' },
        ...publicClusterSelect,
      }),
    ])

    if (!project) {
      throw new NotFoundException()
    }

    const store = dbToObj([...projectStore, ...globalConfig])
    const clusters = [...project.clusters, ...publicClusters]
    const zones = new Map<string, (typeof clusters)[number]['zone']>()
    for (const cluster of clusters) {
      zones.set(cluster.zone.id, cluster.zone)
    }

    return Object.values(servicesInfos)
      .map(({ name, title, to, imgSrc, description }) => {
        const toResponse = to
          ? to({
              clusters: clusters as never,
              zones: [...zones.values()] as never,
              environments: project.environments as EnvironmentObject[],
              project: project as never,
              store,
            })
          : []

        const urls = normalizeServiceUrls(toResponse)
        const manifest = populatePluginManifests({
          data: {
            project: projectStore,
            global: globalConfig,
          },
          permissionTarget,
          pluginName: name,
          select: {
            global: true,
            project: true,
          },
        })

        return { imgSrc, title, name, urls, manifest, description }
      })
      .filter(service => service.urls.length || service.manifest.global?.length || service.manifest.project?.length)
  }

  async updateProjectServices(projectId: string, data: PluginsUpdateBody, stripperRoles: Array<'user' | 'admin'>) {
    const pluginKeysCount = Object.fromEntries(
      Object.entries(data).map(([pluginName, values]) => [pluginName, Object.keys(values).length]),
    )

    this.logger.log({ projectId, pluginCount: Object.keys(data).length, pluginKeysCount, stripperRoles }, 'Update project services started')

    for (const role of stripperRoles) {
      const parsedData = editStrippers.project[role].safeParse(data)
      if (!parsedData.success) continue

      await saveProjectStore(objToDb(parsedData.data), projectId, this.prisma)
    }

    this.logger.log({ projectId }, 'Update project services completed')
  }
}
