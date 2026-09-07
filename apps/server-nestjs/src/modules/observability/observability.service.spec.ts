import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { DISABLED, PROJECT_PERMS } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { observabilityConfigFactory } from '../../config/observability.config'
import { GitlabClientService } from '../gitlab/gitlab-client.service'
import { KeycloakClientService } from '../keycloak/keycloak-client.service'
import { ObservabilityClientService } from './observability-client.service'
import { ObservabilityDatastoreService } from './observability-datastore.service'
import { makeProject } from './observability-testing.utils'
import { ENABLED_PLUGIN_KEY } from './observability.constants'
import { ObservabilityService } from './observability.service'

const PROD_STAGE = { name: 'prod' } as const
const HPROD_STAGE = { name: 'hprod' } as const

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
      upsertProjectGroupRepo: vi.fn().mockResolvedValue({ id: 42 }),
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

  describe('syncValuesFile', () => {
    it('scopes the repository url by project slug with a .git suffix', async () => {
      const project = makeProject({ slug: 'infra-observability' })
      await service.handleUpsert(project)
      expect(client.updateProjectConfig).toHaveBeenCalledWith(
        { id: 1 },
        project,
        expect.objectContaining({
          projectRepository: { url: 'https://gitlab.test/proj/infra-observability/infra-observability.git', path: '.' },
        }),
      )
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

  describe('syncKeycloakGroups', () => {
    it('does not remove existing members from either pair when both stages exist (regression: grafana access loss)', async () => {
      const project = makeProject({
        ownerId: 'owner-1',
        members: [{
          roleIds: ['role-ro'],
          user: { id: 'user-ro', email: 'ro@test.com' },
        }],
        roles: [{ id: 'role-ro', permissions: PROJECT_PERMS.LIST_ENVIRONMENTS, oidcGroup: '', type: 'managed' }],
        environments: [
          { id: 'env-prod', name: 'prod', stage: PROD_STAGE },
          { id: 'env-hprod', name: 'dev', stage: HPROD_STAGE },
        ],
      })

      const pairs: Record<string, { id: string, name: string, path: string, members: { id: string }[] }> = {
        'hprod-RW': { id: 'g-hprod-rw', name: 'hprod-RW', path: '/test-project/grafana/hprod-RW', members: [{ id: 'owner-1' }] },
        'hprod-RO': { id: 'g-hprod-ro', name: 'hprod-RO', path: '/test-project/grafana/hprod-RO', members: [{ id: 'owner-1' }, { id: 'user-ro' }] },
        'prod-RW': { id: 'g-prod-rw', name: 'prod-RW', path: '/test-project/grafana/prod-RW', members: [{ id: 'owner-1' }] },
        'prod-RO': { id: 'g-prod-ro', name: 'prod-RO', path: '/test-project/grafana/prod-RO', members: [{ id: 'owner-1' }, { id: 'user-ro' }] },
      }
      keycloak.getSubGroups.mockImplementation((parentId: string) =>
        (async function* () {
          if (parentId === 'group-1') yield { id: 'g-grafana', name: 'grafana' }
        })(),
      )
      keycloak.getOrCreateSubGroupByName.mockImplementation((_parentId: string, name: string) =>
        Promise.resolve(pairs[name] ?? { id: `sub-${name}`, name, path: `/test-project/grafana/${name}` }),
      )
      keycloak.getGroupMembers.mockImplementation((groupId: string) =>
        Promise.resolve(Object.values(pairs).find(g => g.id === groupId)?.members ?? []),
      )

      await service.handleUpsert(project)

      expect(keycloak.removeUserFromGroup).not.toHaveBeenCalled()
      expect(keycloak.addUserToGroup).not.toHaveBeenCalled()
    })
  })
})
