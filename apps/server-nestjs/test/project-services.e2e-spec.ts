import type { Plugin, PluginManager } from '@cpn-console/hooks'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { pluginManager } from '@cpn-console/hooks'
import { DEFAULT } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectServicesService } from '../src/modules/core/project-services/project-services.service'
import { ConfigurationModule } from '../src/modules/infrastructure/configuration/configuration.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../src/modules/infrastructure/infrastructure.module'
import { VaultClientService } from '../src/modules/plugins/vault/vault-client.service'
import { VaultService } from '../src/modules/plugins/vault/vault.service'

const canRunProjectServicesE2E = Boolean(process.env.E2E) && Boolean(process.env.DB_URL)

const describeWithProjectServices = describe.runIf(canRunProjectServicesE2E)

const TEST_PLUGIN_NAME = 'e2e-service'

describeWithProjectServices('ProjectServicesService (e2e)', {}, () => {
  let moduleRef: TestingModule
  let prisma: PrismaService
  let service: ProjectServicesService
  let eventEmitter: DeepMockProxy<EventEmitter2>
  let vaultService: DeepMockProxy<VaultService>
  let vaultClient: DeepMockProxy<VaultClientService>
  let pm: PluginManager
  let ownerId: string
  let projectId: string
  let projectSlug: string

  beforeAll(async () => {
    pm = pluginManager({
      mockExternalServices: false,
      mockHooks: true,
      mockMonitoring: true,
      startPlugins: false,
    })

    const plugin: Plugin = {
      infos: {
        name: TEST_PLUGIN_NAME,
        title: 'E2E Service',
        description: 'Service used by e2e tests',
        imgSrc: '/e2e-service.svg',
        config: {
          global: [{
            kind: 'switch',
            key: 'globalEnabled',
            title: 'Global enabled',
            value: DEFAULT,
            initialValue: DEFAULT,
            permissions: {
              user: { read: true, write: false },
              admin: { read: true, write: true },
            },
          }],
          project: [{
            kind: 'switch',
            key: 'enabled',
            title: 'Enabled',
            value: DEFAULT,
            initialValue: DEFAULT,
            permissions: {
              user: { read: true, write: true },
              admin: { read: true, write: true },
            },
          }],
        },
        to: ({ project }) => `/e2e/${project.slug}`,
      },
      subscribedHooks: {},
    }

    pm.register(plugin)

    eventEmitter = mockDeep<EventEmitter2>({
      emitAsync() { return Promise.resolve([]) },
    })
    vaultService = mockDeep<VaultService>({
      listProjectSecrets() { return Promise.resolve([]) },
    })
    vaultClient = mockDeep<VaultClientService>()

    moduleRef = await Test.createTestingModule({
      imports: [ConfigurationModule, InfrastructureModule],
      providers: [
        ProjectServicesService,
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: VaultService, useValue: vaultService },
        { provide: VaultClientService, useValue: vaultClient },
      ],
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

    pm?.unregister(TEST_PLUGIN_NAME)
    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('get returns the registered service for a project member', async () => {
    await prisma.projectPlugin.create({
      data: {
        projectId,
        pluginName: TEST_PLUGIN_NAME,
        key: 'enabled',
        value: 'enabled',
      },
    })

    const services = await service.get(projectId, 'user')
    const e2eService = services.find(entry => entry.name === TEST_PLUGIN_NAME)

    expect(e2eService).toBeTruthy()
    expect(e2eService?.urls[0]?.to).toBe(`/e2e/${projectSlug}`)
    expect(e2eService?.manifest.project?.[0]?.value).toBe('enabled')
  })

  it('rejects get when project does not exist', async () => {
    await expect(service.get(faker.string.uuid(), 'user')).rejects.toThrow(NotFoundException)
  })

  it('update stores project configuration', async () => {
    await service.update(projectId, {
      [TEST_PLUGIN_NAME]: {
        enabled: 'enabled',
      },
    }, ['user'])

    const stored = await prisma.projectPlugin.findUniqueOrThrow({
      where: {
        projectId_pluginName_key: {
          projectId,
          pluginName: TEST_PLUGIN_NAME,
          key: 'enabled',
        },
      },
      select: {
        value: true,
      },
    })

    expect(stored.value).toBe('enabled')
  })
})
