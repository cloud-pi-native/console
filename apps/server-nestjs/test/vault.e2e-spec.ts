import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { baseConfigFactory } from '../src/config/base.config'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { projectSelect } from '../src/modules/vault/vault-datastore.service'
import { makeProjectWithDetails } from '../src/modules/vault/vault-testing.utils'
import { VaultModule } from '../src/modules/vault/vault.module'
import { getDotenvPaths } from '../src/utils/dotenv.utils'

const canRunVaultE2E
  = Boolean(process.env.E2E)

const describeWithVault = describe.runIf(canRunVaultE2E)

describeWithVault('VaultService (e2e)', () => {
  let moduleRef: TestingModule
  let eventEmitter: EventEmitter2
  let vaultClient: VaultClientService
  let prisma: PrismaService

  let ownerId: string
  let testProjectId: string
  let testProjectSlug: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [VaultModule, ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory] }), AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule],
    }).compile()

    await moduleRef.init()

    vaultClient = moduleRef.get<VaultClientService>(VaultClientService)
    prisma = moduleRef.get<PrismaService>(PrismaService)
    eventEmitter = moduleRef.get<EventEmitter2>(EventEmitter2)

    ownerId = faker.string.uuid()
    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'Test',
        lastName: 'Owner',
        type: 'human',
      },
    })
  })

  afterAll(async () => {
    if (testProjectSlug) {
      await eventEmitter.emitAsync('project.delete', makeProjectWithDetails({ slug: testProjectSlug })).catch(() => {})
    }

    if (prisma) {
      await prisma.project.deleteMany({ where: { id: testProjectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.unstubAllEnvs()
  })

  it('should reconcile project in Vault (mount, group, role)', async () => {
    await prisma.project.create({
      data: {
        id: testProjectId,
        slug: testProjectSlug,
        name: testProjectSlug,
        ownerId,
        description: 'E2E Test Project',
        hprodCpu: 0,
        hprodGpu: 0,
        hprodMemory: 0,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
      },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    await eventEmitter.emitAsync('project.upsert', project)

    const adminGroupName = `project-${testProjectSlug}-admin`
    const group = await vaultClient.getIdentityGroupName(adminGroupName)
    expect(group.data?.id).toBeTruthy()
    expect(group.data?.name).toBe(adminGroupName)
  }, 180000)

  it('should remove project from Vault on delete', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    await eventEmitter.emitAsync('project.delete', project)

    const adminGroupName = `project-${testProjectSlug}-admin`
    await expect(vaultClient.getIdentityGroupName(adminGroupName)).rejects.toThrow('Not Found')
  }, 180000)
})
