import type { ZoneObject } from '@cpn-console/hooks'
import type { PermissionTarget, PluginsUpdateBody, ProjectService } from '@cpn-console/shared'
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { PluginService } from '../plugin/plugin.service.js'
import {
  buildProjectEditStrippers,
  generatePluginsUpdateBody,
  normalizeServiceUrls,
  parsePluginsUpdateBody,
  populateServiceManifest,
  projectServicesProjectSelect,
  publicClusterSelect,
  saveProjectStore,
} from './services.utils'

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PluginService) private readonly plugin: PluginService,
  ) {}

  async get(projectId: string, permissionTarget: PermissionTarget): Promise<ProjectService[]> {
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
      throw new NotFoundException('Projet introuvable')
    }

    const store = generatePluginsUpdateBody([...projectStore, ...globalConfig])
    const clusters = [...project.clusters, ...publicClusters]
    const zones = new Map<string, ZoneObject>()
    for (const cluster of clusters) {
      zones.set(cluster.zone.id, cluster.zone)
    }
    for (const environment of project.environments) {
      const zone = environment.cluster?.zone
      if (zone) zones.set(zone.id, zone)
    }
    const serviceInfos = await this.plugin.infos(projectId)

    const services = await Promise.all(serviceInfos.map(async (serviceInfo) => {
      const { name, title, to, imgSrc, description } = serviceInfo
      let toResponse: unknown = []
      if (to) {
        try {
          toResponse = to({
            clusters: clusters.map(c => ({
              id: c.id,
              label: c.label,
              privacy: c.privacy,
              clusterResources: c.clusterResources,
              infos: c.infos,
              zone: c.zone,
            })),
            zones: [...zones.values()],
            environments: project.environments,
            project: {
              id: project.id,
              name: project.name,
              slug: project.slug,
            },
            store,
          })
        } catch (error) {
          this.logger.debug({ err: error, service: name }, 'Service URL generation failed, returning no URLs')
        }
      }

      const urls = normalizeServiceUrls(toResponse)
      const manifest = populateServiceManifest({
        service: serviceInfo,
        data: {
          project: projectStore,
          global: globalConfig,
        },
        permissionTarget,
        select: {
          global: true,
          project: true,
        },
      })

      return { imgSrc, title, name, urls, manifest, description }
    }))

    return services.filter(service => service.urls.length || service.manifest.global?.length || service.manifest.project?.length)
  }

  async update(projectId: string, data: PluginsUpdateBody, stripperRoles: Array<'user' | 'admin'>) {
    this.logger.log(`Update project services started (projectId=${projectId}, pluginCount=${Object.keys(data).length}, stripperRoles=${stripperRoles.join(',')})`)
    const editStrippers = buildProjectEditStrippers(await this.plugin.infos(projectId))

    for (const role of stripperRoles) {
      const parsedData = editStrippers.project[role].safeParse(data)
      if (!parsedData.success) continue

      await saveProjectStore(parsePluginsUpdateBody(parsedData.data), projectId, this.prisma)
    }

    this.logger.log(`Update project services completed (projectId=${projectId})`)
  }
}
