import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { GitlabService } from '../gitlab/gitlab.service'
import { NexusService } from '../nexus/nexus.service'
import { RegistryService } from '../registry/registry.service'
import { VaultService } from '../vault/vault.service'
import { ProjectSecretsService } from './project-secrets.service'

describe('projectSecretsService', () => {
  let service: ProjectSecretsService
  let gitlab: DeepMockProxy<GitlabService>
  let nexus: DeepMockProxy<NexusService>
  let registry: DeepMockProxy<RegistryService>
  let vault: DeepMockProxy<VaultService>

  beforeEach(async () => {
    gitlab = mockDeep<GitlabService>({
      getSecrets: vi.fn(async (projectId: string) => ({ projectId, key1: 'value1' })),
    })
    nexus = mockDeep<NexusService>({
      getSecrets: vi.fn(async (projectId: string) => ({ projectId, NEXUS_SOME_TOKEN: 'ok' })),
    })
    registry = mockDeep<RegistryService>({
      getSecrets: vi.fn(async (projectId: string) => ({ projectId, REGISTRY_ROBOT_SECRET: 'robot' })),
    })
    vault = mockDeep<VaultService>({
      getSecrets: vi.fn(async (projectId: string) => ({ projectId, VAULT_ROLE: 'role' })),
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectSecretsService,
        { provide: GitlabService, useValue: gitlab },
        { provide: NexusService, useValue: nexus },
        { provide: RegistryService, useValue: registry },
        { provide: VaultService, useValue: vault },
      ],
    }).compile()

    service = moduleRef.get(ProjectSecretsService)
  })

  it('delegates to each module service with only the projectId and aggregates the groups', async () => {
    const projectId = faker.string.uuid()

    const result = await service.get(projectId)

    expect(gitlab.getSecrets).toHaveBeenCalledWith(projectId)
    expect(nexus.getSecrets).toHaveBeenCalledWith(projectId)
    expect(registry.getSecrets).toHaveBeenCalledWith(projectId)
    expect(vault.getSecrets).toHaveBeenCalledWith(projectId)
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
    gitlab.getSecrets.mockResolvedValue({ key1: 'value1' })
    nexus.getSecrets.mockResolvedValue({})
    registry.getSecrets.mockResolvedValue({})
    vault.getSecrets.mockResolvedValue({})

    const result = await service.get(projectId)

    expect(result).toEqual({ GITLAB: { key1: 'value1' } })
  })

  it('skips groups whose module service is absent', async () => {
    const projectId = faker.string.uuid()

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectSecretsService,
        { provide: NexusService, useValue: nexus },
        { provide: RegistryService, useValue: registry },
        { provide: VaultService, useValue: vault },
      ],
    }).compile()

    const partial = moduleRef.get(ProjectSecretsService)
    const result = await partial.get(projectId)

    // GitlabService absent: GITLAB group is not exposed even though the module exists
    expect(result).toEqual({
      NEXUS: { projectId, NEXUS_SOME_TOKEN: 'ok' },
      REGISTRY: { projectId, REGISTRY_ROBOT_SECRET: 'robot' },
      VAULT: { projectId, VAULT_ROLE: 'role' },
    })
  })
})
