import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
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

  const projectId = 'project-1'
  const slug = 'proj-1'

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

  async function seedGitlabGroup() {
    prisma.project.findUnique.mockResolvedValue(makeProjectSlug({ slug }) as unknown as ProjectSlug)
    vault.listProjectSecrets.mockResolvedValue(['GITLAB'])
    vaultClient.read.mockResolvedValue(makeVaultSecret({
      data: { GIT_MIRROR_PROJECT_ID: '42', GIT_MIRROR_TOKEN: 'secret-token' },
    }))
  }

  it('should inject the CURL COMMAND hint into the GITLAB group when displayTriggerHint is enabled', async () => {
    prisma.adminPlugin.findUnique.mockResolvedValue(null)
    await seedGitlabGroup()

    const result = await service.get(projectId)

    expect(result.GITLAB['CURL COMMAND']).toContain('curl -k')
    expect(result.GITLAB['CURL COMMAND']).toContain('https://gitlab.example.com/api/v4/projects/42/trigger/pipeline')
    expect(result.GITLAB['CURL COMMAND']).toContain('PRIVATE-TOKEN: secret-token')
  })

  it('should not inject the CURL COMMAND when displayTriggerHint is disabled', async () => {
    prisma.adminPlugin.findUnique.mockResolvedValue(makeAdminPlugin({ pluginName: 'gitlab', key: 'displayTriggerHint', value: 'disabled' }))
    await seedGitlabGroup()

    const result = await service.get(projectId)

    expect(result.GITLAB['CURL COMMAND']).toBeUndefined()
  })

  it('should not inject the CURL COMMAND when the GITLAB group has no mirror token/project id', async () => {
    prisma.adminPlugin.findUnique.mockResolvedValue(null)
    prisma.project.findUnique.mockResolvedValue(makeProjectSlug({ slug }) as unknown as ProjectSlug)
    vault.listProjectSecrets.mockResolvedValue(['GITLAB'])
    vaultClient.read.mockResolvedValue(makeVaultSecret({ data: {} }))

    const result = await service.get(projectId)

    expect(result.GITLAB['CURL COMMAND']).toBeUndefined()
  })
})
