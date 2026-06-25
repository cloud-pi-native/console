import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ConfigurationModule } from '../src/modules/infrastructure/configuration/configuration.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../src/modules/infrastructure/infrastructure.module'
import { ProjectServicesModule } from '../src/modules/project-services/project-services.module'
import { ProjectServicesService } from '../src/modules/project-services/project-services.service'

const canRunServicesE2E
  = Boolean(process.env.E2E)
    && Boolean(process.env.DB_URL)
    && Boolean(process.env.ARGOCD_URL)
    && Boolean(process.env.GITLAB_URL)
    && Boolean(process.env.GITLAB_TOKEN)
    && Boolean(process.env.HARBOR_URL)
    && Boolean(process.env.HARBOR_INTERNAL_URL)
    && Boolean(process.env.HARBOR_ADMIN)
    && Boolean(process.env.HARBOR_ADMIN_PASSWORD)
    && Boolean(process.env.KEYCLOAK_DOMAIN)
    && Boolean(process.env.KEYCLOAK_REALM)
    && Boolean(process.env.KEYCLOAK_PROTOCOL)
    && Boolean(process.env.NEXUS_URL)
    && Boolean(process.env.NEXUS_INTERNAL_URL)
    && Boolean(process.env.NEXUS_ADMIN)
    && Boolean(process.env.NEXUS_ADMIN_PASSWORD)
    && Boolean(process.env.SONARQUBE_URL)
    && Boolean(process.env.SONARQUBE_INTERNAL_URL)
    && Boolean(process.env.SONAR_API_TOKEN)
    && Boolean(process.env.VAULT_URL)
    && Boolean(process.env.VAULT_TOKEN)
    && Boolean(process.env.PROJECTS_ROOT_DIR)

const describeWithServices = describe.runIf(canRunServicesE2E)

const TEST_PLUGIN_NAME = 'gitlab'

describeWithServices('ProjectServicesService (e2e)', {}, () => {
  let moduleRef: TestingModule
  let prisma: PrismaService
  let service: ProjectServicesService
  let ownerId: string
  let projectId: string
  let projectSlug: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigurationModule, InfrastructureModule, ProjectServicesModule],
    }).compile()

    await moduleRef.init()

    prisma = moduleRef.get(PrismaService)
    service = moduleRef.get(ProjectServicesService)

    ownerId = faker.string.uuid()
    projectId = faker.string.uuid()
    projectSlug = faker.helpers.slugify(`e2e-project-${faker.string.uuid()}`)

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'E2E',
        lastName: 'Owner',
        type: 'human',
      },
    })

    await prisma.project.create({
      data: {
        id: projectId,
        slug: projectSlug,
        name: projectSlug,
        ownerId,
        description: 'E2E test project',
        status: 'created',
        locked: false,
        limitless: false,
        hprodCpu: 0,
        hprodGpu: 0,
        hprodMemory: 0,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
        everyonePerms: 0n,
        lastSuccessProvisionningVersion: null,
      },
    })
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.projectPlugin.deleteMany({ where: { projectId } }).catch(() => {})
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('get returns services for a project member', async () => {
    const services = await service.get(projectId, 'user')
    const gitlabService = services.find(entry => entry.name === TEST_PLUGIN_NAME)

    expect(gitlabService).toBeTruthy()
    expect(gitlabService?.name).toBe(TEST_PLUGIN_NAME)
  })

  it('rejects get when project does not exist', async () => {
    await expect(service.get(faker.string.uuid(), 'user')).rejects.toThrow(NotFoundException)
  })

  it('update stores project configuration', async () => {
    await service.update(projectId, {
      gitlab: {
        enabled: 'enabled',
      },
    }, ['user'])

    const stored = await prisma.projectPlugin.findUniqueOrThrow({
      where: {
        projectId_pluginName_key: {
          projectId,
          pluginName: TEST_PLUGIN_NAME,
          key: 'user.enabled',
        },
      },
      select: {
        value: true,
      },
    })

    expect(stored.value).toBe('enabled')
  })
})
