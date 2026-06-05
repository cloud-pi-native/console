import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ConfigurationModule } from '../src/modules/infrastructure/configuration/configuration.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { InfrastructureModule } from '../src/modules/infrastructure/infrastructure.module'
import { ProjectSecretsModule } from '../src/modules/project-secrets/project-secrets.module'
import { ProjectSecretsService } from '../src/modules/project-secrets/project-secrets.service'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { generateProjectPath } from '../src/modules/vault/vault.utils'

const canRunProjectSecretsE2E
  = Boolean(process.env.E2E)
    && Boolean(process.env.DB_URL)
    && Boolean(process.env.VAULT_URL)
    && Boolean(process.env.VAULT_TOKEN)
    && Boolean(process.env.PROJECTS_ROOT_DIR)

const describeWithProjectSecrets = describe.runIf(canRunProjectSecretsE2E)

describeWithProjectSecrets('ProjectSecretsService (e2e)', {}, () => {
  let moduleRef: TestingModule
  let prisma: PrismaService
  let service: ProjectSecretsService
  let vaultClient: VaultClientService

  let ownerId: string
  let projectId: string
  let projectSlug: string
  let projectPath: string
  let secretAPath: string
  let secretBPath: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigurationModule, InfrastructureModule, ProjectSecretsModule],
    }).compile()

    await moduleRef.init()

    prisma = moduleRef.get(PrismaService)
    service = moduleRef.get(ProjectSecretsService)
    vaultClient = moduleRef.get(VaultClientService)

    ownerId = faker.string.uuid()
    projectId = faker.string.uuid()
    projectSlug = faker.helpers.slugify(`e2e-project-${faker.string.uuid()}`)
    projectPath = generateProjectPath(process.env.PROJECTS_ROOT_DIR, projectSlug)
    secretAPath = `${projectPath}/group1/secret1`
    secretBPath = `${projectPath}/group2/secret2`

    await Promise.all([secretAPath, secretBPath].map(path => vaultClient.delete(path).catch(() => {})))

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
    await Promise.all([secretAPath, secretBPath].map(path => vaultClient.delete(path).catch(() => {})))

    if (prisma) {
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns an empty secret map when Vault lookup fails', async () => {
    vi.spyOn(vaultClient, 'listProjectSecrets').mockRejectedValueOnce(new Error('Vault is unavailable'))

    const secrets = await service.get(projectId)

    expect(secrets).toEqual({})
  })

  it('returns an empty secret map when no Vault secrets exist', async () => {
    const secrets = await service.get(projectId)

    expect(secrets).toEqual({})
  })

  describe('when Vault secrets exist', () => {
    beforeAll(async () => {
      await Promise.all([
        vaultClient.write({
          key1: 'value1',
          key2: 42,
        }, secretAPath),
        vaultClient.write({
          key3: false,
          key4: null,
        }, secretBPath),
      ])
    })

    afterAll(async () => {
      await Promise.all([
        vaultClient.delete(secretAPath).catch(() => {}),
        vaultClient.delete(secretBPath).catch(() => {}),
      ])
    })

    it('parses real Vault values into grouped secrets', async () => {
      const secrets = await service.get(projectId)

      expect(secrets.group1).toEqual({
        'secret1.key1': 'value1',
        'secret1.key2': '42',
      })
      expect(secrets.group2).toEqual({
        'secret2.key3': 'false',
        'secret2.key4': '',
      })
    })
  })
})
