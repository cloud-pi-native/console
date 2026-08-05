import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { observabilityConfigFactory } from '../../config/observability.config'
import { GitlabClientService } from '../gitlab/gitlab-client.service'
import { KeycloakClientService } from '../keycloak/keycloak-client.service'
import { ObservabilityClientService } from './observability-client.service'
import { ObservabilityDatastoreService } from './observability-datastore.service'
import { makeProject } from './observability-testing.utils'
import { DISABLED } from '@cpn-console/shared'
import { ENABLED_PLUGIN_KEY } from './observability.constants'
import { ObservabilityService } from './observability.service'

describe('observabilityService', () => {
  let service: ObservabilityService
  let datastore: DeepMockProxy<ObservabilityDatastoreService>
  let client: DeepMockProxy<ObservabilityClientService>
  let gitlab: DeepMockProxy<GitlabClientService>
  let keycloak: DeepMockProxy<KeycloakClientService>
  let config: DeepMockProxy<ConfigType<typeof observabilityConfigFactory>>

  beforeEach(async () => {
    datastore = mockDeep<ObservabilityDatastoreService>()
    client = mockDeep<ObservabilityClientService>({
      getOrCreateValuesRepo: vi.fn().mockResolvedValue({ id: 1 }),
      updateProjectConfig: vi.fn().mockResolvedValue('updated'),
      deleteProjectConfig: vi.fn().mockResolvedValue(undefined),
    })
    gitlab = mockDeep<GitlabClientService>({
      upsertProjectGroupRepo: vi.fn().mockResolvedValue(undefined),
      getOrCreateProjectGroupRepo: vi.fn().mockResolvedValue({ id: 42 }),
      getOrCreateProjectGroupPublicUrl: vi.fn().mockResolvedValue('https://gitlab.test/proj'),
      generateCreateOrUpdateAction: vi.fn().mockResolvedValue(null),
      maybeCreateCommit: vi.fn().mockResolvedValue(undefined),
    })
    keycloak = mockDeep<KeycloakClientService>({
      getGroupByPath: vi.fn().mockResolvedValue({ id: 'group-1' }),
      getSubGroups: vi.fn(async function* () {}),
      getOrCreateSubGroupByName: vi.fn().mockResolvedValue({ id: 'sub-1' }),
      getGroupMembers: vi.fn().mockResolvedValue([]),
      addUserToGroup: vi.fn().mockResolvedValue(undefined),
      removeUserFromGroup: vi.fn().mockResolvedValue(undefined),
      deleteGroup: vi.fn().mockResolvedValue(undefined),
    })
    config = mockDeep<ConfigType<typeof observabilityConfigFactory>>({
      grafanaUrl: 'https://grafana.test',
      chartVersion: '0.1.7',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        ObservabilityService,
        { provide: ObservabilityDatastoreService, useValue: datastore },
        { provide: ObservabilityClientService, useValue: client },
        { provide: GitlabClientService, useValue: gitlab },
        { provide: KeycloakClientService, useValue: keycloak },
        { provide: observabilityConfigFactory.KEY, useValue: config },
      ],
    }).compile()

    service = moduleRef.get(ObservabilityService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('handleUpsert', () => {
    it('skips when plugin disabled', async () => {
      const project = makeProject({
        plugins: [{ pluginName: 'observability', key: ENABLED_PLUGIN_KEY, value: DISABLED }],
      })
      const result = await service.handleUpsert(project)
      expect(result.observability.status).toBe('OK')
      expect(gitlab.upsertProjectGroupRepo).not.toHaveBeenCalled()
    })
  })

  describe('handleDelete', () => {
    it('cleans up keycloak groups and values', async () => {
      await service.handleDelete(makeProject())
      expect(client.deleteProjectConfig).toHaveBeenCalled()
    })

    it('skips cleanup when plugin disabled', async () => {
      const project = makeProject({
        plugins: [{ pluginName: 'observability', key: ENABLED_PLUGIN_KEY, value: DISABLED }],
      })
      await service.handleDelete(project)
      expect(client.deleteProjectConfig).not.toHaveBeenCalled()
    })
  })
})
