import type { Mocked } from 'vitest'
import type { VaultMetadata, VaultSecret } from '../vault/vault-client.service'
import type { RegistryResponse } from './registry-http-client.service'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { projectRobotName, RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import {
  PLATFORM_ADMIN_GROUP_PATH_PLUGIN_KEY,
  PLATFORM_GUEST_GROUP_PATHS_PLUGIN_KEY,
  PROJECT_ADMIN_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_GUEST_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT,
  REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT,
} from './registry.constants'
import { RegistryService } from './registry.service'

function ok<T>(data: T): RegistryResponse<T> {
  return { status: 200, data }
}

function created<T>(data: T): RegistryResponse<T> {
  return { status: 201, data }
}

function noContent(): RegistryResponse<null> {
  return { status: 204, data: null }
}

function vaultSecret<T>(data: T): VaultSecret<T> {
  const metadata: VaultMetadata = {
    created_time: new Date().toISOString(),
    custom_metadata: null,
    deletion_time: '',
    destroyed: false,
    version: 1,
  }
  return { data, metadata }
}

function createRegistryControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      RegistryService,
      {
        provide: RegistryClientService,
        useValue: {
          getProjectRobots: vi.fn(),
          createRobot: vi.fn(),
          deleteRobot: vi.fn(),
          getGroupMembers: vi.fn(),
          addGroupMember: vi.fn(),
          removeGroupMember: vi.fn(),
          getProjectByName: vi.fn(),
          listQuotas: vi.fn(),
          updateQuota: vi.fn(),
          createProject: vi.fn(),
          getRetentionId: vi.fn(),
          updateRetention: vi.fn(),
          createRetention: vi.fn(),
          deleteProjectByName: vi.fn(),
        } satisfies Partial<RegistryClientService>,
      },
      {
        provide: RegistryDatastoreService,
        useValue: {
          getAdminPluginConfig: vi.fn(),
          getAllProjects: vi.fn(),
        } satisfies Partial<RegistryDatastoreService>,
      },
      {
        provide: VaultClientService,
        useValue: {
          read: vi.fn(),
          write: vi.fn(),
          delete: vi.fn(),
        } satisfies Partial<VaultClientService>,
      },
      {
        provide: ConfigurationService,
        useValue: {
          harborUrl: 'https://harbor.example',
          harborInternalUrl: 'https://harbor.example',
          harborAdmin: 'admin',
          harborAdminPassword: 'password',
          harborRuleTemplate: 'latestPushedK',
          harborRuleCount: '10',
          harborRetentionCron: '0 22 2 * * *',
          projectRootDir: 'forge',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('registryService', () => {
  let service: RegistryService
  let registry: Mocked<RegistryClientService>
  let vault: Mocked<VaultClientService>
  let registryDatastore: Mocked<RegistryDatastoreService>

  beforeEach(async () => {
    const moduleRef = await createRegistryControllerServiceTestingModule().compile()
    service = moduleRef.get(RegistryService)
    registry = moduleRef.get(RegistryClientService)
    vault = moduleRef.get(VaultClientService)
    registryDatastore = moduleRef.get(RegistryDatastoreService)

    registryDatastore.getAdminPluginConfig.mockResolvedValue(null)

    registry.getProjectByName.mockResolvedValue(ok({ project_id: 123, metadata: {} }))
    registry.listQuotas.mockResolvedValue(ok([{ ref: { id: 123 }, hard: { storage: -1 } }]))

    registry.getRetentionId.mockResolvedValue(null)
    registry.createRetention.mockResolvedValue(created(null))

    vault.read.mockResolvedValue(vaultSecret({
      HOST: 'harbor.example',
      DOCKER_CONFIG: '{}',
      USERNAME: 'robot$myproj+ro-robot',
      TOKEN: 'secret',
    }))
    vault.write.mockResolvedValue(undefined)

    registry.getGroupMembers.mockResolvedValue(ok([]))
    registry.addGroupMember.mockResolvedValue(created(null))
    registry.removeGroupMember.mockResolvedValue(noContent())
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('adds expected Harbor group memberships based on defaults', async () => {
    await service.ensureProject({ slug: 'myproj', plugins: [] }, { storageLimitBytes: -1 })

    const expected = [
      { groupName: '/myproj', roleId: 5 },
      { groupName: '/console/readonly', roleId: 3 },
      { groupName: '/console/security', roleId: 3 },
      { groupName: '/myproj/console/readonly', roleId: 3 },
      { groupName: '/myproj/console/security', roleId: 3 },
      { groupName: '/myproj/console/developer', roleId: 2 },
      { groupName: '/myproj/console/devops', roleId: 4 },
      { groupName: '/myproj/console/admin', roleId: 1 },
      { groupName: '/console/admin', roleId: 1 },
    ]

    expect(registry.addGroupMember).toHaveBeenCalledTimes(expected.length)
    for (const e of expected) {
      expect(registry.addGroupMember).toHaveBeenCalledWith('myproj', {
        role_id: e.roleId,
        member_group: {
          group_name: e.groupName,
          group_type: 3,
        },
      })
    }
  })

  it('reconciles an existing group membership when role differs', async () => {
    registry.getGroupMembers.mockResolvedValueOnce(ok([
      { id: 10, entity_name: '/myproj/console/developer', entity_type: 'g', role_id: 3 },
    ]))

    await service.ensureProject({ slug: 'myproj', plugins: [] }, { storageLimitBytes: -1 })

    expect(registry.removeGroupMember).toHaveBeenCalledWith('myproj', 10)
    expect(registry.addGroupMember).toHaveBeenCalledWith('myproj', {
      role_id: 2,
      member_group: {
        group_name: '/myproj/console/developer',
        group_type: 3,
      },
    })
  })

  it('throws when Maintainer membership creation fails', async () => {
    registry.addGroupMember.mockImplementation(async (_projectName, body) => {
      if (body.member_group.group_name === '/myproj/console/devops' && body.role_id === 4) {
        return { status: 400, data: null }
      }
      return { status: 201, data: null }
    })

    await expect(service.ensureProject({ slug: 'myproj', plugins: [] }, { storageLimitBytes: -1 })).rejects.toThrow('Harbor create member failed')

    expect(registry.addGroupMember).toHaveBeenCalledWith('myproj', {
      role_id: 4,
      member_group: {
        group_name: '/myproj/console/devops',
        group_type: 3,
      },
    })
  })

  it('dedupes by group name and keeps the last access level', async () => {
    await service.ensureProject({
      slug: 'myproj',
      plugins: [
        { key: PLATFORM_ADMIN_GROUP_PATH_PLUGIN_KEY, value: '' },
        { key: PLATFORM_GUEST_GROUP_PATHS_PLUGIN_KEY, value: '' },
        { key: PROJECT_ADMIN_GROUP_PATH_SUFFIXES_PLUGIN_KEY, value: '' },
        { key: PROJECT_MAINTAINER_GROUP_PATH_SUFFIXES_PLUGIN_KEY, value: '' },
        { key: PROJECT_GUEST_GROUP_PATH_SUFFIXES_PLUGIN_KEY, value: '/console/developer' },
        { key: PROJECT_DEVELOPER_GROUP_PATH_SUFFIXES_PLUGIN_KEY, value: '/console/developer' },
      ],
    }, { storageLimitBytes: -1 })

    expect(registry.addGroupMember).toHaveBeenCalledWith('myproj', {
      role_id: 2,
      member_group: {
        group_name: '/myproj/console/developer',
        group_type: 3,
      },
    })
  })

  it('updates quota when it differs', async () => {
    registry.listQuotas.mockResolvedValueOnce(ok([{ ref: { id: 123 }, hard: { storage: -1 } }]))

    await service.ensureProject({ slug: 'myproj', plugins: [] }, { storageLimitBytes: 1024 })

    expect(registry.updateQuota).toHaveBeenCalledWith(123, 1024)
  })

  it('reuses robot secret when vault secret host matches', async () => {
    await service.ensureProject({ slug: 'myproj', plugins: [] }, { storageLimitBytes: -1 })

    expect(registry.getProjectRobots).not.toHaveBeenCalled()
    expect(registry.createRobot).not.toHaveBeenCalled()
    expect(registry.deleteRobot).not.toHaveBeenCalled()
    expect(vault.write).not.toHaveBeenCalled()
  })

  it('rotates robot and writes secret when vault secret host differs', async () => {
    vault.read.mockImplementation(async (path: string) => {
      if (path === 'forge/myproj/REGISTRY/ro-robot') {
        return vaultSecret({
          HOST: 'other.example',
          DOCKER_CONFIG: '{}',
          USERNAME: 'robot$myproj+ro-robot',
          TOKEN: 'old',
        })
      }
      return vaultSecret({
        HOST: 'harbor.example',
        DOCKER_CONFIG: '{}',
        USERNAME: 'robot$myproj+rw-robot',
        TOKEN: 'secret',
      })
    })

    registry.getProjectRobots.mockResolvedValue(ok([{ id: 11, name: 'robot$myproj+ro-robot' }]))
    registry.deleteRobot.mockResolvedValue(noContent())
    registry.createRobot.mockResolvedValue(created({ id: 22, name: 'robot$myproj+ro-robot', secret: 'newsecret' }))

    await service.ensureProject({ slug: 'myproj', plugins: [] }, { storageLimitBytes: -1 })

    expect(registry.deleteRobot).toHaveBeenCalledWith('myproj', 11)
    expect(registry.createRobot).toHaveBeenCalledWith(expect.objectContaining({ name: 'ro-robot' }))
    expect(vault.write).toHaveBeenCalledWith(expect.objectContaining({
      HOST: 'harbor.example',
      USERNAME: 'robot$myproj+ro-robot',
      TOKEN: 'newsecret',
    }), 'forge/myproj/REGISTRY/ro-robot')
  })

  it('handleUpsert parses plugin config and enables project robot publishing', async () => {
    const ensureProjectSpy = vi.spyOn(service, 'ensureProject')
    registry.getProjectByName.mockResolvedValue(ok({ project_id: 1, metadata: {} }))

    await service.handleUpsert({
      slug: 'myproj',
      plugins: [
        { key: REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT, value: '1gb' },
        { key: REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT, value: 'enabled' },
      ],
    } as any)

    expect(ensureProjectSpy).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'myproj' }),
      expect.objectContaining({ storageLimitBytes: 1024 ** 3, publishProjectRobot: true }),
    )
    expect(registry.updateQuota).toHaveBeenCalledWith(1, 1024 ** 3)
    expect(vault.read).toHaveBeenCalledWith('forge/myproj/REGISTRY/ro-robot')
    expect(vault.read).toHaveBeenCalledWith('forge/myproj/REGISTRY/rw-robot')
    expect(vault.read).toHaveBeenCalledWith(`forge/myproj/REGISTRY/${projectRobotName}`)
  })
})
