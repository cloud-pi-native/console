import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ConfigurationModule } from '../src/cpin-module/infrastructure/configuration/configuration.module'
import { PrismaService } from '../src/cpin-module/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../src/cpin-module/infrastructure/infrastructure.module'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { projectSelect } from '../src/modules/vault/vault-datastore.service'
import { makeProjectWithDetails } from '../src/modules/vault/vault-testing.utils'
import { VaultModule } from '../src/modules/vault/vault.module'
import { VaultService } from '../src/modules/vault/vault.service'

const canRunVaultE2E
  = Boolean(process.env.E2E)
    && Boolean(process.env.VAULT_URL)
    && Boolean(process.env.VAULT_TOKEN)
    && Boolean(process.env.DB_URL)

const describeWithVault = describe.runIf(canRunVaultE2E)

describeWithVault('VaultController (e2e)', () => {
  let moduleRef: TestingModule
  let vaultController: VaultService
  let vaultClient: VaultClientService
  let prisma: PrismaService

  let ownerId: string
  let testProjectId: string
  let testProjectSlug: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [VaultModule, ConfigurationModule, InfrastructureModule],
    }).compile()

    await moduleRef.init()

    vaultController = moduleRef.get<VaultService>(VaultService)
    vaultClient = moduleRef.get<VaultClientService>(VaultClientService)
    prisma = moduleRef.get<PrismaService>(PrismaService)

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
      await vaultController.handleDelete(makeProjectWithDetails({ slug: testProjectSlug })).catch(() => {})
    }

    if (prisma) {
      await prisma.project.deleteMany({ where: { id: testProjectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef.close()

    vi.restoreAllMocks()
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

    await vaultController.handleUpsert(project)

    const group = await vaultClient.getIdentityGroupName(testProjectSlug)
    expect(group.data?.id).toBeTruthy()
    expect(group.data?.name).toBe(testProjectSlug)
    expect(group.data?.alias?.name).toBe(`/${testProjectSlug}`)
  }, 180000)
})
