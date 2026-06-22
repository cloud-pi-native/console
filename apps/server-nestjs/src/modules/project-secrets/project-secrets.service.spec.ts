import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service.js'
import { PrismaService } from '../infrastructure/database/prisma.service.js'
import { makeProject, makeVaultSecret } from '../project/project-testing.utils.js'
import { VaultClientService } from '../vault/vault-client.service.js'
import { VaultService } from '../vault/vault.service.js'
import { ProjectSecretsService } from './project-secrets.service.js'

describe('projectSecretsService', () => {
  let module: TestingModule
  let service: ProjectSecretsService
  let prisma: DeepMockProxy<PrismaService>
  let vault: DeepMockProxy<VaultService>
  let vaultClient: DeepMockProxy<VaultClientService>
  let config: DeepMockProxy<ConfigurationService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    vault = mockDeep<VaultService>()
    vaultClient = mockDeep<VaultClientService>()
    config = mockDeep<ConfigurationService>()
    config.projectRootDir = '/vault'

    module = await Test.createTestingModule({
      providers: [
        ProjectSecretsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigurationService, useValue: config },
        { provide: VaultService, useValue: vault },
        { provide: VaultClientService, useValue: vaultClient },
      ],
    }).compile()

    service = module.get(ProjectSecretsService)
  })

  it('returns parsed secrets from vault', async () => {
    const projectId = 'project-id'
    prisma.project.findUnique.mockResolvedValue(makeProject({ slug: 'myproject' }))
    vault.listProjectSecrets.mockResolvedValue(['group1/secret1'])
    vaultClient.read.mockResolvedValue(makeVaultSecret({ data: { key1: 'value1', key2: 42, key3: true, key4: null } }))

    const result = await service.getSecrets(projectId)

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: projectId },
      select: { slug: true },
    })
    expect(vault.listProjectSecrets).toHaveBeenCalledWith('myproject')
    expect(result).toHaveProperty('group1')
    expect(result.group1).toHaveProperty('secret1.key1', 'value1')
    expect(result.group1).toHaveProperty('secret1.key2', '42')
    expect(result.group1).toHaveProperty('secret1.key3', 'true')
    expect(result.group1).toHaveProperty('secret1.key4', '')
  })

  it('handles nested secret paths', async () => {
    prisma.project.findUnique.mockResolvedValue(makeProject({ slug: 'myproj' }))
    vault.listProjectSecrets.mockResolvedValue(['group1/sub/path'])
    vaultClient.read.mockResolvedValue(makeVaultSecret({ data: { nested: 'value' } }))

    const result = await service.getSecrets('project-id')

    expect(result.group1).toHaveProperty('sub/path.nested', 'value')
  })

  it('returns empty object when no secrets exist', async () => {
    prisma.project.findUnique.mockResolvedValue(makeProject({ slug: 'myproj' }))
    vault.listProjectSecrets.mockResolvedValue([])

    const result = await service.getSecrets('project-id')

    expect(result).toEqual({})
  })

  it('skips secrets that fail to read', async () => {
    prisma.project.findUnique.mockResolvedValue(makeProject({ slug: 'myproj' }))
    vault.listProjectSecrets.mockResolvedValue(['group1/s1', 'group1/s2'])
    vaultClient.read
      .mockRejectedValueOnce(new Error('vault error'))
      .mockResolvedValueOnce(makeVaultSecret({ data: { key: 'val' } }))

    const result = await service.getSecrets('project-id')

    expect(result.group1).toEqual({ 's2.key': 'val' })
  })
})
