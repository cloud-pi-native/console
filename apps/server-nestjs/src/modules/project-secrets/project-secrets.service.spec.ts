import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { GitlabPluginService } from '../gitlab/gitlab-plugin.service'
import { NexusPluginService } from '../nexus/nexus-plugin.service'
import { RegistryPluginService } from '../registry/registry-plugin.service'
import { VaultPluginService } from '../vault/vault-plugin.service'
import { ProjectSecretsService } from './project-secrets.service'

describe('projectSecretsService', () => {
  let service: ProjectSecretsService
  let gitlab: DeepMockProxy<GitlabPluginService>
  let nexus: DeepMockProxy<NexusPluginService>
  let registry: DeepMockProxy<RegistryPluginService>
  let vault: DeepMockProxy<VaultPluginService>

  beforeEach(async () => {
    gitlab = mockDeep<GitlabPluginService>({
      secrets: vi.fn(async (projectId: string) => ({ projectId, key1: 'value1' })),
    })
    nexus = mockDeep<NexusPluginService>({
      secrets: vi.fn(async (projectId: string) => ({ projectId, NEXUS_SOME_TOKEN: 'ok' })),
    })
    registry = mockDeep<RegistryPluginService>({
      secrets: vi.fn(async (projectId: string) => ({ projectId, REGISTRY_ROBOT_SECRET: 'robot' })),
    })
    vault = mockDeep<VaultPluginService>({
      secrets: vi.fn(async (projectId: string) => ({ projectId, VAULT_ROLE: 'role' })),
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectSecretsService,
        { provide: GitlabPluginService, useValue: gitlab },
        { provide: NexusPluginService, useValue: nexus },
        { provide: RegistryPluginService, useValue: registry },
        { provide: VaultPluginService, useValue: vault },
      ],
    }).compile()

    service = moduleRef.get(ProjectSecretsService)
  })

  it('delegates to each module service with only the projectId and aggregates the groups', async () => {
    const projectId = faker.string.uuid()

    const result = await service.get(projectId)

    expect(gitlab.secrets).toHaveBeenCalledWith(projectId)
    expect(nexus.secrets).toHaveBeenCalledWith(projectId)
    expect(registry.secrets).toHaveBeenCalledWith(projectId)
    expect(vault.secrets).toHaveBeenCalledWith(projectId)
    expect(result).toEqual({
      GITLAB: { projectId, key1: 'value1' },
      NEXUS: { projectId, NEXUS_SOME_TOKEN: 'ok' },
      REGISTRY: { projectId, REGISTRY_ROBOT_SECRET: 'robot' },
      VAULT: { projectId, VAULT_ROLE: 'role' },
    })
  })

  it('returns {} when no module service is available', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectSecretsService,
      ],
    }).compile()

    const unconfigured = moduleRef.get(ProjectSecretsService)
    const result = await unconfigured.get(faker.string.uuid())
    expect(result).toEqual({})
  })

  it('drops empty groups while keeping populated ones', async () => {
    const projectId = faker.string.uuid()
    gitlab.secrets.mockResolvedValue({ key1: 'value1' })
    nexus.secrets.mockResolvedValue({})
    registry.secrets.mockResolvedValue({})
    vault.secrets.mockResolvedValue({})

    const result = await service.get(projectId)

    expect(result).toEqual({ GITLAB: { key1: 'value1' } })
  })

  it('skips groups whose module service is absent', async () => {
    const projectId = faker.string.uuid()

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectSecretsService,
        { provide: NexusPluginService, useValue: nexus },
        { provide: RegistryPluginService, useValue: registry },
        { provide: VaultPluginService, useValue: vault },
      ],
    }).compile()

    const partial = moduleRef.get(ProjectSecretsService)
    const result = await partial.get(projectId)

    // GitlabPluginService absent: GITLAB group is not exposed even though the module exists
    expect(result).toEqual({
      NEXUS: { projectId, NEXUS_SOME_TOKEN: 'ok' },
      REGISTRY: { projectId, REGISTRY_ROBOT_SECRET: 'robot' },
      VAULT: { projectId, VAULT_ROLE: 'role' },
    })
  })
})
