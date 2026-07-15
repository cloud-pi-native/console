import type { Plugin, ServiceInfos } from '@cpn-console/hooks'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { ClusterWithZone, ProjectWithRelations } from './project-services-testing.utils'
import { ENABLED } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { PluginService } from '../plugin/plugin.service'
import {
  makeClusterWithZone,
  makeEnvironmentWithCluster,
  makePlugin,
  makeProjectPlugin,
  makeProjectWithRelations,
  makeServicesUpdateBody,
} from './project-services-testing.utils'
import { ProjectServicesService } from './project-services.service'

function makeEmptyServiceInfo(name: string): ServiceInfos {
  return {
    name,
    title: name,
    config: {
      global: [],
      project: [],
    },
  }
}

describe('servicesService', () => {
  let module: TestingModule
  let service: ProjectServicesService
  let prisma: DeepMockProxy<PrismaService>
  let projectId: string
  let pluginName: string
  let projectSlug: string
  let serviceTitle: string
  let serviceDescription: string
  let serviceImgSrc: string
  let project: ProjectWithRelations
  let cluster: ClusterWithZone
  let plugin: Plugin

  beforeEach(async () => {
    projectId = faker.string.uuid()
    projectSlug = faker.helpers.slugify(faker.company.name())
    serviceTitle = faker.commerce.productName()
    serviceDescription = faker.lorem.sentence()
    serviceImgSrc = `/${faker.helpers.slugify(faker.commerce.product())}.svg`

    plugin = makePlugin({
      title: serviceTitle,
      description: serviceDescription,
      imgSrc: serviceImgSrc,
      to: ({ project }) => `/projects/${project.slug}`,
    })
    pluginName = plugin.infos.name
    project = makeProjectWithRelations({ id: projectId, slug: projectSlug })
    cluster = makeClusterWithZone()

    prisma = mockDeep<PrismaService>()

    module = await Test.createTestingModule({
      providers: [
        ProjectServicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PluginService, useValue: { infos: async () => [plugin.infos, makeEmptyServiceInfo('gitlab'), makeEmptyServiceInfo('harbor'), makeEmptyServiceInfo('keycloak'), makeEmptyServiceInfo('nexus'), makeEmptyServiceInfo('sonarqube'), makeEmptyServiceInfo('vault')] } },
      ],
    }).compile()

    service = module.get(ProjectServicesService)
  })

  afterEach(async () => {
    await module?.close()
  })

  it('get returns the service with actual hooks data', async () => {
    prisma.project.findUnique.mockResolvedValue(project)
    prisma.projectPlugin.findMany.mockResolvedValue([
      makeProjectPlugin({ projectId, pluginName, value: ENABLED }),
    ])
    prisma.adminPlugin.findMany.mockResolvedValue([])
    prisma.cluster.findMany.mockResolvedValue([cluster])

    const result = await service.get(projectId, 'user')
    const e2eService = result.find(entry => entry.name === pluginName)

    expect(e2eService).toMatchObject({
      name: pluginName,
      title: serviceTitle,
      imgSrc: serviceImgSrc,
      urls: [{ to: `/projects/${projectSlug}`, name: '' }],
    })
    expect(e2eService?.manifest.project?.[0]).toMatchObject({
      key: 'enabled',
      value: ENABLED,
    })
  })

  it('get includes zones coming from project environments', async () => {
    const baseZone = makeClusterWithZone().zone
    const environmentZone = makeClusterWithZone({
      zone: {
        ...baseZone,
        argocdUrl: 'https://argocd.example.com',
      },
    })
    const projectWithEnvironmentZones = makeProjectWithRelations({
      clusters: [],
      environments: [
        makeEnvironmentWithCluster({
          cluster: environmentZone,
        }),
      ],
    })
    const envZonePlugin = makePlugin({
      to: ({ zones }) => zones.map(zone => ({
        to: `${zone.argocdUrl}/applications?search=${zone.slug}`,
        title: zone.label,
      })),
    })

    prisma.project.findUnique.mockResolvedValue(projectWithEnvironmentZones)
    prisma.projectPlugin.findMany.mockResolvedValue([])
    prisma.adminPlugin.findMany.mockResolvedValue([])
    prisma.cluster.findMany.mockResolvedValue([])

    const envModule = await Test.createTestingModule({
      providers: [
        ProjectServicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PluginService, useValue: { infos: async () => [envZonePlugin.infos] } },
      ],
    }).compile()
    const envService = envModule.get(ProjectServicesService)

    const result = await envService.get(projectId, 'user')

    expect(result.find(entry => entry.name === envZonePlugin.infos.name)).toMatchObject({
      urls: [{ to: `${environmentZone.zone.argocdUrl}/applications?search=${environmentZone.zone.slug}`, name: environmentZone.zone.label }],
    })
    await envModule.close()
  })

  it('update stores project configuration through the real utility', async () => {
    const data = makeServicesUpdateBody(pluginName)

    await service.update(projectId, data, ['user'])

    expect(prisma.projectPlugin.upsert).toHaveBeenCalledWith({
      where: {
        projectId_pluginName_key: {
          projectId,
          pluginName,
          key: 'enabled',
        },
      },
      create: {
        projectId,
        pluginName,
        key: 'enabled',
        value: data[pluginName].enabled,
      },
      update: {
        pluginName,
        key: 'enabled',
        value: data[pluginName].enabled,
      },
    })
  })
})
