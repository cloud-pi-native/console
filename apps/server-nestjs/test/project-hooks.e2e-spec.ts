import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationModule } from '../src/modules/infrastructure/configuration/configuration.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../src/modules/infrastructure/infrastructure.module'
import { ProjectHooksModule } from '../src/modules/project-hooks/project-hooks.module'
import { ProjectHooksService } from '../src/modules/project-hooks/project-hooks.service'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { VaultService } from '../src/modules/vault/vault.service'

const canRunProjectHooksE2E = Boolean(process.env.E2E) && Boolean(process.env.DB_URL)

const describeWithProjectHooks = describe.runIf(canRunProjectHooksE2E)

describeWithProjectHooks('ProjectHooksService (e2e)', {}, () => {
  let moduleRef: TestingModule
  let prisma: PrismaService
  let service: ProjectHooksService
  let eventEmitter: DeepMockProxy<EventEmitter2>
  let vaultService: DeepMockProxy<VaultService>
  let vaultClient: DeepMockProxy<VaultClientService>

  let ownerId: string
  let projectId: string
  let projectSlug: string

  beforeAll(async () => {
    vaultService = mockDeep<VaultService>()
    vaultService.listProjectSecrets.mockResolvedValue([])
    vaultClient = mockDeep<VaultClientService>()

    moduleRef = await Test.createTestingModule({
      imports: [ConfigurationModule, InfrastructureModule, ProjectHooksModule],
      providers: [
        { provide: VaultService, useValue: vaultService },
        { provide: VaultClientService, useValue: vaultClient },
      ],
    }).compile()

    await moduleRef.init()

    prisma = moduleRef.get(PrismaService)
    service = moduleRef.get(ProjectHooksService)
    eventEmitter = moduleRef.get(EventEmitter2)
    vi.spyOn(eventEmitter, 'emitAsync').mockResolvedValue([])

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
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('replays hooks through the event system', async () => {
    await service.replay(projectId)

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      'project.upsert',
      expect.objectContaining({ id: projectId, slug: projectSlug }),
    )
  })

  it('rejects replayHooks when the project does not exist', async () => {
    const result = await service.replay(faker.string.uuid())
    expect(result).toBeUndefined()
  })
})
