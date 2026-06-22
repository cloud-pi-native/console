import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationModule } from '../src/modules/infrastructure/configuration/configuration.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../src/modules/infrastructure/infrastructure.module'
import { ProjectSecretsModule } from '../src/modules/project-secrets/project-secrets.module'
import { ProjectSecretsService } from '../src/modules/project-secrets/project-secrets.service'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { makeVaultSecret } from '../src/modules/vault/vault-testing.utils'
import { VaultService } from '../src/modules/vault/vault.service'

const canRunProjectSecretsE2E = Boolean(process.env.E2E) && Boolean(process.env.DB_URL)

const describeWithProjectSecrets = describe.runIf(canRunProjectSecretsE2E)

describeWithProjectSecrets('ProjectSecretsService (e2e)', {}, () => {
  let moduleRef: TestingModule
  let prisma: PrismaService
  let service: ProjectSecretsService
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
      imports: [ConfigurationModule, InfrastructureModule, ProjectSecretsModule],
    })
      .overrideProvider(VaultService)
      .useValue(vaultService)
      .overrideProvider(VaultClientService)
      .useValue(vaultClient)
      .compile()

    await moduleRef.init()

    prisma = moduleRef.get(PrismaService)
    service = moduleRef.get(ProjectSecretsService)

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

  it('returns an empty secret map when no secrets exist', async () => {
    const secrets = await service.getSecrets(projectId)
    expect(secrets).toEqual({})
    expect(vaultService.listProjectSecrets).toHaveBeenCalledWith(projectSlug)
  })

  it('parses Vault values into grouped secrets', async () => {
    vaultService.listProjectSecrets.mockResolvedValue(['group1/secret1'])
    vaultClient.read.mockResolvedValue(makeVaultSecret({ data: { key1: 'value1', key2: 42 } }))

    const secrets = await service.getSecrets(projectId)

    expect(secrets.group1).toEqual({
      'secret1.key1': 'value1',
      'secret1.key2': '42',
    })
  })
})
