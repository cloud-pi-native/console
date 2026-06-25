import type { ServiceInfos } from '@cpn-console/hooks'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { ProjectWithDetails, PublicCluster } from './project-services-queries.utils'
import { ENABLED } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { PluginService } from '../plugin/plugin.service'
import {
  makeProjectPlugin,
  makeProjectWithDetails,
  makePublicCluster,
  makeServicesEnvironment,
  makeServicesPlugin,
  makeServicesUpdateBody,
  makeServicesZone,
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
  let project: ProjectWithDetails
  let cluster: PublicCluster
  let plugin: ServicePlugin

  beforeEach(async () => {
    projectId = faker.string.uuid()
    projectSlug = faker.helpers.slugify(faker.company.name())
    serviceTitle = faker.commerce.productName()
    serviceDescription = faker.lorem.sentence()
    serviceImgSrc = `/${faker.helpers.slugify(faker.commerce.product())}.svg`

    plugin = makeServicesPlugin({
      title: serviceTitle,
      description: serviceDescription,
      imgSrc: serviceImgSrc,
      to: ({ project }) => `/projects/${project.slug}`,
    })
    pluginName = plugin.infos.name
    project = makeProjectWithDetails({ slug: projectSlug })
    cluster = makePublicCluster()

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
      makeProjectPlugin({ pluginName, value: ENABLED }),
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
    const environmentZone = {
      id: faker.string.uuid(),
      slug: faker.helpers.slugify(faker.word.noun()).toLowerCase(),
      label: faker.word.noun(),
      argocdUrl: 'https://argocd.example.com',
    }
    const projectWithEnvironmentZones = makeProjectWithDetails({
      clusters: [],
      environments: [
        makeServicesEnvironment({
          cluster: makePublicCluster({
            zone: makeServicesZone(environmentZone),
          }),
        }),
      ],
    })
    const envZonePlugin = makeServicesPlugin({
      to: ({ zones }) => zones.map(zone => ({
        to: `${zone.argocdUrl}/applications?search=${zone.slug}`,
        title: zone.label,
      })),
    })

    prisma.project.findUnique.mockResolvedValue(projectWithEnvironmentZones)
    prisma.projectPlugin.findMany.mockResolvedValue([])
    prisma.adminPlugin.findMany.mockResolvedValue([])
    prisma.cluster.findMany.mockResolvedValue([])

    const module = await Test.createTestingModule({
      providers: [
        ProjectServicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PluginService, useValue: { infos: async () => [envZonePlugin.infos] } },
      ],
    }).compile()
    const envService = module.get(ProjectServicesService)

    const result = await envService.get(projectId, 'user')

    expect(result.find(entry => entry.name === envZonePlugin.infos.name)).toMatchObject({
      urls: [{ to: `${environmentZone.argocdUrl}/applications?search=${environmentZone.slug}`, name: environmentZone.label }],
    })
    await module.close()
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
