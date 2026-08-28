import type { ProjectSchema } from '@gitbeaker/core'
import type { CondensedProjectSchemaWith } from '../gitlab/gitlab-client.service'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GitlabClientService } from '../gitlab/gitlab-client.service'
import { makeProjectSchema } from '../gitlab/gitlab-testing.utils'
import { ObservabilityClientService } from './observability-client.service'
import { observabilityYamlInitData } from './observability.utils'

describe('observabilityClientService', () => {
  let service: ObservabilityClientService
  let gitlab: {
    getOrCreateGroupByPath: ReturnType<typeof vi.fn>
    getGroupRepos: ReturnType<typeof vi.fn>
    createGroupRepo: ReturnType<typeof vi.fn>
    getFile: ReturnType<typeof vi.fn>
    generateCreateOrUpdateAction: ReturnType<typeof vi.fn>
    maybeCreateCommit: ReturnType<typeof vi.fn>
  }

  const repo = makeProjectSchema({ name: 'values' }) as unknown as CondensedProjectSchemaWith<'id'>

  beforeEach(async () => {
    gitlab = {
      getOrCreateGroupByPath: vi.fn(),
      getGroupRepos: vi.fn(),
      createGroupRepo: vi.fn(),
      getFile: vi.fn(),
      generateCreateOrUpdateAction: vi.fn(),
      maybeCreateCommit: vi.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        ObservabilityClientService,
        { provide: GitlabClientService, useValue: gitlab },
      ],
    }).compile()

    service = moduleRef.get(ObservabilityClientService)
  })

  describe('getOrCreateValuesRepo', () => {
    it('returns the existing repo when the group already contains it', async () => {
      gitlab.getOrCreateGroupByPath.mockResolvedValue({ id: 7 })
      gitlab.getGroupRepos.mockImplementation(async function* () {
        yield { id: 9, name: 'other' }
        yield { id: 12, name: 'observability' }
      })

      await expect(service.getOrCreateValuesRepo()).resolves.toMatchObject({ id: 12 })
      expect(gitlab.createGroupRepo).not.toHaveBeenCalled()
    })

    it('creates the repo when absent from the group', async () => {
      gitlab.getOrCreateGroupByPath.mockResolvedValue({ id: 7 })
      gitlab.getGroupRepos.mockImplementation(async function* () {})
      gitlab.createGroupRepo.mockResolvedValue({ id: 99, name: 'observability' } as ProjectSchema)

      await expect(service.getOrCreateValuesRepo()).resolves.toMatchObject({ id: 99 })
      expect(gitlab.createGroupRepo).toHaveBeenCalledWith(7, 'observability')
    })
  })

  describe('getValuesFile', () => {
    it('falls back to a fresh init payload when the file is absent', async () => {
      gitlab.getFile.mockResolvedValue(undefined)

      const data = await service.getValuesFile(repo)
      expect(data).toEqual({ global: { tenants: {} } })
      // must be a clone: mutating the result must not corrupt the shared init constant
      data.global!.tenants!.x = {}
      expect(observabilityYamlInitData.global.tenants).toEqual({})
    })

    it('parses and validates base64 yaml content', async () => {
      const yaml = 'global:\n  projects:\n    pid-1:\n      projectName: p\n      projectRepository:\n        url: https://r\n        path: .\n      envs: {}\n'
      gitlab.getFile.mockResolvedValue({
        content: Buffer.from(yaml).toString('base64'),
      })

      const data = await service.getValuesFile(repo)
      expect(data.global?.projects?.['pid-1']).toMatchObject({ projectName: 'p' })
    })

    it('rejects schema-invalid yaml (zod guard)', async () => {
      gitlab.getFile.mockResolvedValue({
        content: Buffer.from('global: 42\n').toString('base64'),
      })

      await expect(service.getValuesFile(repo)).rejects.toThrow()
    })
  })

  describe('updateProjectConfig', () => {
    it('skips the commit when the stored value is equal to the desired one (idempotent re-run)', async () => {
      gitlab.getFile.mockResolvedValue({
        content: Buffer.from(
          `global:\n  projects:\n    pid:\n      projectName: p\n      projectRepository:\n        url: https://r\n        path: .\n      envs: {}\n`,
        ).toString('base64'),
      })

      await service.updateProjectConfig(
        repo,
        { id: 'pid', slug: 'p' },
        { projectName: 'p', projectRepository: { url: 'https://r', path: '.' }, envs: {} },
      )
      expect(gitlab.maybeCreateCommit).not.toHaveBeenCalled()
    })

    it('commits when the value differs and preserves sibling projects', async () => {
      gitlab.getFile.mockResolvedValue({
        content: Buffer.from(
          'global:\n  projects:\n    other-id:\n      projectName: other\n      projectRepository:\n        url: https://r2\n        path: .\n      envs: {}\n',
        ).toString('base64'),
      })
      gitlab.generateCreateOrUpdateAction.mockResolvedValue({ action: 'create', content: 'YAMLCONTENT' })

      await service.updateProjectConfig(
        repo,
        { id: 'new-id', slug: 'new' },
        { projectName: 'new', projectRepository: { url: 'https://r3', path: '.' }, envs: {} },
      )

      expect(gitlab.maybeCreateCommit).toHaveBeenCalledTimes(1)
      // the service passes the merged yaml as the content arg to generateCreateOrUpdateAction
      const contentArg = vi.mocked(gitlab.generateCreateOrUpdateAction).mock.calls[0][3] as string
      expect(contentArg).toContain('other-id')
      expect(contentArg).toContain('new-id')
    })
  })

  describe('deleteProjectConfig', () => {
    it('is a no-op when the project is not in the values file', async () => {
      gitlab.getFile.mockResolvedValue({
        content: Buffer.from('global:\n  tenants: {}\n').toString('base64'),
      })

      await service.deleteProjectConfig(repo, { id: 'ghost', slug: 'g', name: 'g' })
      expect(gitlab.maybeCreateCommit).not.toHaveBeenCalled()
    })

    it('removes only the target project and commits', async () => {
      gitlab.getFile.mockResolvedValue({
        content: Buffer.from(
          'global:\n  projects:\n    keep:\n      projectName: k\n      projectRepository:\n        url: https://r\n        path: .\n      envs: {}\n    drop:\n      projectName: d\n      projectRepository:\n        url: https://r\n        path: .\n      envs: {}\n',
        ).toString('base64'),
      })
      gitlab.generateCreateOrUpdateAction.mockResolvedValue({ action: 'update', content: 'YAMLCONTENT' })

      await service.deleteProjectConfig(repo, { id: 'drop', slug: 'd', name: 'd' })

      expect(gitlab.maybeCreateCommit).toHaveBeenCalledTimes(1)
      const contentArg = vi.mocked(gitlab.generateCreateOrUpdateAction).mock.calls[0][3] as string
      expect(contentArg).toContain('keep')
      expect(contentArg).not.toContain('drop')
    })
  })
})
