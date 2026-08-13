import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { makeProjectWithDetails } from '../project/project-testing.utils'
import { VaultClientService } from '../vault/vault-client.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { GitlabPluginService } from './gitlab-plugin.service'

describe('gitlabPluginService', () => {
  let service: GitlabPluginService
  let config: DeepMockProxy<ConfigType<typeof gitlabConfigFactory>>
  let datastore: DeepMockProxy<GitlabDatastoreService>
  let vault: DeepMockProxy<VaultClientService>

  beforeEach(async () => {
    config = mockDeep<ConfigType<typeof gitlabConfigFactory>>({
      url: 'https://gitlab.example.com',
      projectRootDir: 'forge',
    })
    datastore = mockDeep<GitlabDatastoreService>({
      getAdminPluginConfig: vi.fn().mockResolvedValue(null),
      getAdminRolesByOidcGroups: vi.fn().mockResolvedValue([]),
    })
    vault = mockDeep<VaultClientService>({
      readGitlabSecrets: vi.fn().mockResolvedValue({}),
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        GitlabPluginService,
        { provide: VaultClientService, useValue: vault },
        { provide: GitlabDatastoreService, useValue: datastore },
        { provide: gitlabConfigFactory.KEY, useValue: config },
      ],
    }).compile()

    service = moduleRef.get(GitlabPluginService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('secrets', () => {
    it('injects the CURL COMMAND hint when mirror credentials exist (displayTriggerHint default)', async () => {
      const baseProject = makeProjectWithDetails({ slug: 'test-project' })
      datastore.getProject.mockResolvedValue(baseProject)
      datastore.getAdminPluginConfig.mockResolvedValue(null)
      vault.readGitlabSecrets.mockResolvedValue({
        GIT_MIRROR_PROJECT_ID: '42',
        GIT_MIRROR_TOKEN: 'secret-token',
      })

      const result = await service.secrets('test-project-id')

      expect(result['CURL COMMAND']).toContain('curl -k')
      expect(result['CURL COMMAND']).toContain('https://gitlab.example.com/api/v4/projects/42/trigger/pipeline')
      expect(result['CURL COMMAND']).toContain('PRIVATE-TOKEN: secret-token')
    })

    it('does not inject when displayTriggerHint is disabled', async () => {
      const baseProject = makeProjectWithDetails({ slug: 'test-project' })
      datastore.getProject.mockResolvedValue(baseProject)
      datastore.getAdminPluginConfig.mockResolvedValue('disabled')
      vault.readGitlabSecrets.mockResolvedValue({
        GIT_MIRROR_PROJECT_ID: '42',
        GIT_MIRROR_TOKEN: 'secret-token',
      })

      const result = await service.secrets('test-project-id')

      expect(result['CURL COMMAND']).toBeUndefined()
    })

    it('does not inject when mirror credentials are missing', async () => {
      const baseProject = makeProjectWithDetails({ slug: 'test-project' })
      datastore.getProject.mockResolvedValue(baseProject)
      datastore.getAdminPluginConfig.mockResolvedValue(null)
      vault.readGitlabSecrets.mockResolvedValue({ OTHER_KEY: 'value' })

      const result = await service.secrets('test-project-id')

      expect(result['CURL COMMAND']).toBeUndefined()
      expect(result).toEqual({ OTHER_KEY: 'value' })
    })
  })

  describe('infos', () => {
    it('should expose the legacy project url', () => {
      const infos = service.infos()
      const url = infos.to?.(makeToUrlParams({ project: { id: '', name: '', slug: 'dulei' } }))

      expect(url).toBe('https://gitlab.example.com/forge/dulei')
    })
  })
})
