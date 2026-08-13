import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { baseConfigFactory } from '../../config/base.config'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { VaultClientService } from '../vault/vault-client.service'
import { VaultService } from '../vault/vault.service'
import { makeAdminPlugin, makeProjectSlug, makeVaultSecret, type ProjectSlug } from './project-secrets-testing.utils'
import { ProjectSecretsService } from './project-secrets.service'

describe('ProjectSecretsService', () => {
  let service: ProjectSecretsService
  let prisma: DeepMockProxy<PrismaService>
  let vault: DeepMockProxy<VaultService>
  let vaultClient: DeepMockProxy<VaultClientService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    vault = mockDeep<VaultService>({ listProjectSecrets: vi.fn().mockResolvedValue([]) })
    vaultClient = mockDeep<VaultClientService>({ read: vi.fn().mockResolvedValue(null) })

    const baseConfig = mockDeep<ConfigType<typeof baseConfigFactory>>({ projectsRootDir: 'forge' })
    const gitlabConfig = mockDeep<ConfigType<typeof gitlabConfigFactory>>({ url: 'https://gitlab.example.com' })

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectSecretsService,
        { provide: PrismaService, useValue: prisma },
        { provide: baseConfigFactory.KEY, useValue: baseConfig },
        { provide: gitlabConfigFactory.KEY, useValue: gitlabConfig },
        { provide: VaultService, useValue: vault },
        { provide: VaultClientService, useValue: vaultClient },
      ],
    }).compile()

    service = moduleRef.get(ProjectSecretsService)
  })

  it('returns parsed secrets from vault', async () => {
    const projectId = faker.string.uuid()
    const slug = faker.lorem.slug()
    prisma.project.findUnique.mockResolvedValue(makeProjectSlug({ slug }) as unknown as ProjectSlug)
    vault.listProjectSecrets.mockResolvedValue(['group1/secret1'])
    vaultClient.read.mockResolvedValue(makeVaultSecret({ data: { key1: 'value1', key2: 42, key3: true, key4: null } }))

    const result = await service.get(projectId)

    expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { id: projectId }, select: { slug: true } })
    expect(vault.listProjectSecrets).toHaveBeenCalledWith(slug)
    expect(result).toHaveProperty('group1')
    expect(result.group1).toHaveProperty('secret1.key1', 'value1')
    expect(result.group1).toHaveProperty('secret1.key2', '42')
    expect(result.group1).toHaveProperty('secret1.key3', 'true')
    expect(result.group1).toHaveProperty('secret1.key4', '')
  })

  it('handles nested secret paths', async () => {
    const slug = faker.lorem.slug()
    prisma.project.findUnique.mockResolvedValue(makeProjectSlug({ slug }) as unknown as ProjectSlug)
    vault.listProjectSecrets.mockResolvedValue(['group1/sub/path'])
    vaultClient.read.mockResolvedValue(makeVaultSecret({ data: { nested: 'value' } }))

    const result = await service.get(faker.string.uuid())

    expect(result.group1).toHaveProperty('sub/path.nested', 'value')
  })

  it('returns empty object when no secrets exist', async () => {
    prisma.project.findUnique.mockResolvedValue(makeProjectSlug({ slug: faker.lorem.slug() }) as unknown as ProjectSlug)
    vault.listProjectSecrets.mockResolvedValue([])

    const result = await service.get(faker.string.uuid())

    expect(result).toEqual({})
  })

  it('returns empty object when secret listing fails', async () => {
    prisma.project.findUnique.mockResolvedValue(makeProjectSlug({ slug: faker.lorem.slug() }) as unknown as ProjectSlug)
    vault.listProjectSecrets.mockRejectedValue(new Error('vault unavailable'))

    const result = await service.get(faker.string.uuid())

    expect(result).toEqual({})
  })

  it('skips secrets that fail to read', async () => {
    const slug = faker.lorem.slug()
    prisma.project.findUnique.mockResolvedValue(makeProjectSlug({ slug }) as unknown as ProjectSlug)
    vault.listProjectSecrets.mockResolvedValue(['group1/s1', 'group1/s2'])
    vaultClient.read
      .mockRejectedValueOnce(new Error('vault error'))
      .mockResolvedValueOnce(makeVaultSecret({ data: { key: 'val' } }))

    const result = await service.get(faker.string.uuid())

    expect(result.group1).toEqual({ 's2.key': 'val' })
  })

  describe('CURL COMMAND injection', () => {
    beforeEach(async () => {
      prisma.project.findUnique.mockResolvedValue(makeProjectSlug({ slug: faker.lorem.slug() }) as unknown as ProjectSlug)
      vault.listProjectSecrets.mockResolvedValue(['GITLAB'])
      vaultClient.read.mockResolvedValue(
        makeVaultSecret({ data: { GIT_MIRROR_PROJECT_ID: '42', GIT_MIRROR_TOKEN: 'secret-token' } }),
      )
    })

    it('injects the hint when displayTriggerHint is enabled (default)', async () => {
      prisma.adminPlugin.findUnique.mockResolvedValue(null)

      const result = await service.get(faker.string.uuid())

      expect(result.GITLAB['CURL COMMAND']).toContain('curl -k')
      expect(result.GITLAB['CURL COMMAND']).toContain('https://gitlab.example.com/api/v4/projects/42/trigger/pipeline')
      expect(result.GITLAB['CURL COMMAND']).toContain('PRIVATE-TOKEN: secret-token')
    })

    it('does not inject when displayTriggerHint is disabled', async () => {
      prisma.adminPlugin.findUnique.mockResolvedValue(
        makeAdminPlugin({ pluginName: 'gitlab', key: 'displayTriggerHint', value: 'disabled' }),
      )

      const result = await service.get(faker.string.uuid())

      expect(result.GITLAB['CURL COMMAND']).toBeUndefined()
    })
  })

  describe('without mirror credentials', () => {
    beforeEach(async () => {
      prisma.project.findUnique.mockResolvedValue(makeProjectSlug({ slug: faker.lorem.slug() }) as unknown as ProjectSlug)
      vault.listProjectSecrets.mockResolvedValue(['GITLAB'])
      vaultClient.read.mockResolvedValue(makeVaultSecret({ data: {} }))
    })

    it('does not inject the CURL COMMAND', async () => {
      prisma.adminPlugin.findUnique.mockResolvedValue(null)

      const result = await service.get(faker.string.uuid())

      expect(result.GITLAB['CURL COMMAND']).toBeUndefined()
    })
  })
})
