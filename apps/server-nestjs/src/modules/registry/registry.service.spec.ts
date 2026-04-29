import type { Mocked } from 'vitest'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { makeVaultSecret } from '../vault/vault-testing.utils.js'
import { projectRobotName, RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { makeCreatedResponse, makeNoContent, makeOkResponse, makeProjectWithDetails } from './registry-testing.utils.js'
import {
  REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT,
  REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT,
} from './registry.constants'
import { RegistryService } from './registry.service'

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
          harborAdminPassword: faker.internet.password(),
          harborRuleTemplate: 'latestPushedK',
          harborRuleCount: '10',
          harborRetentionCron: '0 22 2 * * *',
          harborRobotRotationThresholdDays: 90,
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

    registry.getProjectByName.mockResolvedValue(makeOkResponse({ project_id: 123, metadata: {} }))
    registry.listQuotas.mockResolvedValue(makeOkResponse([{ ref: { id: 123 }, hard: { storage: -1 } }]))

    registry.getRetentionId.mockResolvedValue(null)
    registry.createRetention.mockResolvedValue(makeCreatedResponse(null))

    vault.read.mockResolvedValue(makeVaultSecret({
      data: {
        HOST: 'harbor.example',
        DOCKER_CONFIG: '{}',
        USERNAME: 'robot$myproj+ro-robot',
        TOKEN: 'secret',
      },
    }))
    vault.write.mockResolvedValue(undefined)

    registry.getGroupMembers.mockResolvedValue(makeOkResponse([]))
    registry.addGroupMember.mockResolvedValue(makeCreatedResponse(null))
    registry.removeGroupMember.mockResolvedValue(makeNoContent())

    registry.deleteProjectByName.mockResolvedValue(makeNoContent())
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('handleUpsert', () => {
    it('adds expected Harbor group memberships based on defaults', async () => {
      const project = makeProjectWithDetails()

      await service.handleUpsert(project)

      const expected = [
        { groupName: `/${project.slug}`, roleId: 5 },
        { groupName: '/console/admin', roleId: 1 },
        { groupName: '/console/readonly', roleId: 3 },
        { groupName: '/console/security', roleId: 3 },
        { groupName: `/${project.slug}/console/readonly`, roleId: 3 },
        { groupName: `/${project.slug}/console/security`, roleId: 3 },
        { groupName: `/${project.slug}/console/developer`, roleId: 2 },
        { groupName: `/${project.slug}/console/devops`, roleId: 4 },
        { groupName: `/${project.slug}/console/admin`, roleId: 1 },
      ]

      expect(registry.addGroupMember).toHaveBeenCalledTimes(expected.length)
      for (const e of expected) {
        expect(registry.addGroupMember).toHaveBeenCalledWith(project.slug, {
          role_id: e.roleId,
          member_group: {
            group_name: e.groupName,
            group_type: 3,
          },
        })
      }
    })

    it('reconciles an existing group membership when role differs', async () => {
      const project = makeProjectWithDetails()
      registry.getGroupMembers.mockResolvedValueOnce(makeOkResponse([
        { id: 10, entity_name: `/${project.slug}/console/developer`, entity_type: 'g', role_id: 3 },
      ]))

      await service.handleUpsert(project)

      expect(registry.removeGroupMember).toHaveBeenCalledWith(project.slug, 10)
      expect(registry.addGroupMember).toHaveBeenCalledWith(project.slug, {
        role_id: 2,
        member_group: {
          group_name: `/${project.slug}/console/developer`,
          group_type: 3,
        },
      })
    })

    it('throws when Maintainer membership creation fails', async () => {
      const project = makeProjectWithDetails()
      registry.addGroupMember.mockImplementation(async (_projectName, body) => {
        if (body.member_group.group_name === `/${project.slug}/console/devops` && body.role_id === 4) {
          return { status: 400, data: null }
        }
        return { status: 201, data: null }
      })

      await expect(service.handleUpsert(project)).rejects.toThrow('Harbor create member failed')

      expect(registry.addGroupMember).toHaveBeenCalledWith(project.slug, {
        role_id: 4,
        member_group: {
          group_name: `/${project.slug}/console/devops`,
          group_type: 3,
        },
      })
    })

    it('updates quota when it differs', async () => {
      registry.listQuotas.mockResolvedValueOnce(makeOkResponse([{ ref: { id: 123 }, hard: { storage: -1 } }]))

      await service.handleUpsert(makeProjectWithDetails({
        slug: 'myproj',
        plugins: [
          { key: REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT, value: '1024' },
        ],
      }))

      expect(registry.updateQuota).toHaveBeenCalledWith(123, 1024)
    })

    it('reuses robot secret when vault secret host matches', async () => {
      const project = makeProjectWithDetails()

      await service.handleUpsert(project)

      expect(vault.read).toHaveBeenCalledTimes(2)
      expect(vault.read).toHaveBeenCalledWith(`forge/${project.slug}/REGISTRY/ro-robot`)
      expect(vault.read).toHaveBeenCalledWith(`forge/${project.slug}/REGISTRY/rw-robot`)
      expect(registry.getProjectRobots).not.toHaveBeenCalled()
      expect(registry.createRobot).not.toHaveBeenCalled()
      expect(registry.deleteRobot).not.toHaveBeenCalled()
      expect(vault.write).not.toHaveBeenCalled()
    })

    it('rotates robot and writes secret when vault secret host differs', async () => {
      const project = makeProjectWithDetails()
      vault.read.mockImplementation(async (path: string) => {
        if (path === `forge/${project.slug}/REGISTRY/ro-robot`) {
          return makeVaultSecret({
            data: {
              HOST: 'other.example',
              DOCKER_CONFIG: '{}',
              USERNAME: `robot$${project.slug}+ro-robot`,
              TOKEN: 'old',
            },
          })
        }
        return makeVaultSecret({
          data: {
            HOST: 'harbor.example',
            DOCKER_CONFIG: '{}',
            USERNAME: `robot$${project.slug}+rw-robot`,
            TOKEN: 'secret',
          },
        })
      })

      registry.getProjectRobots.mockResolvedValue(makeOkResponse([{ id: 11, name: `robot$${project.slug}+ro-robot` }]))
      registry.deleteRobot.mockResolvedValue(makeNoContent())
      registry.createRobot.mockResolvedValue(makeCreatedResponse({ id: 22, name: `robot$${project.slug}+ro-robot`, secret: 'newsecret' }))

      await service.handleUpsert(project)

      expect(registry.deleteRobot).toHaveBeenCalledWith(project.slug, 11)
      expect(registry.createRobot).toHaveBeenCalledWith(expect.objectContaining({ name: 'ro-robot' }))
      expect(vault.write).toHaveBeenCalledWith(expect.objectContaining({
        HOST: 'harbor.example',
        USERNAME: `robot$${project.slug}+ro-robot`,
        TOKEN: 'newsecret',
      }), `forge/${project.slug}/REGISTRY/ro-robot`)
    })

    it('rotates robot and writes secret when vault secret is expiring', async () => {
      const project = makeProjectWithDetails()
      const old = makeVaultSecret({
        data: {
          HOST: 'harbor.example',
          DOCKER_CONFIG: '{}',
          USERNAME: `robot$${project.slug}+ro-robot`,
          TOKEN: 'old',
        },
      })
      old.metadata.created_time = new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString()

      vault.read.mockImplementation(async (path: string) => {
        if (path === `forge/${project.slug}/REGISTRY/ro-robot`) return old
        return makeVaultSecret({
          data: {
            HOST: 'harbor.example',
            DOCKER_CONFIG: '{}',
            USERNAME: `robot$${project.slug}+rw-robot`,
            TOKEN: 'secret',
          },
        })
      })

      registry.getProjectRobots.mockResolvedValue(makeOkResponse([{ id: 11, name: `robot$${project.slug}+ro-robot` }]))
      registry.deleteRobot.mockResolvedValue(makeNoContent())
      registry.createRobot.mockResolvedValue(makeCreatedResponse({ id: 22, name: `robot$${project.slug}+ro-robot`, secret: 'newsecret' }))

      await service.handleUpsert(project)

      expect(registry.deleteRobot).toHaveBeenCalledWith(project.slug, 11)
      expect(registry.createRobot).toHaveBeenCalledWith(expect.objectContaining({ name: 'ro-robot' }))
      expect(vault.write).toHaveBeenCalledWith(expect.objectContaining({
        HOST: 'harbor.example',
        USERNAME: `robot$${project.slug}+ro-robot`,
        TOKEN: 'newsecret',
      }), `forge/${project.slug}/REGISTRY/ro-robot`)
    })

    it('parses plugin config and enables project robot publishing', async () => {
      const project = makeProjectWithDetails({
        plugins: [
          { key: REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT, value: '1gb' },
          { key: REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT, value: 'enabled' },
        ],
      })
      registry.getProjectByName.mockResolvedValue(makeOkResponse({ project_id: 1, metadata: {} }))

      await service.handleUpsert(project)

      expect(registry.updateQuota).toHaveBeenCalledWith(1, 1024 ** 3)
      expect(vault.read).toHaveBeenCalledWith(`forge/${project.slug}/REGISTRY/ro-robot`)
      expect(vault.read).toHaveBeenCalledWith(`forge/${project.slug}/REGISTRY/rw-robot`)
      expect(vault.read).toHaveBeenCalledWith(`forge/${project.slug}/REGISTRY/${projectRobotName}`)
    })
  })

  describe('handleCron', () => {
    it('should reconcile all projects', async () => {
      registryDatastore.getAllProjects.mockResolvedValue([
        makeProjectWithDetails({ slug: 'project-1' }),
        makeProjectWithDetails({ slug: 'project-2' }),
      ])

      await service.handleCron()

      expect(registry.getGroupMembers).toHaveBeenCalledWith('project-1')
      expect(registry.getGroupMembers).toHaveBeenCalledWith('project-2')
    })
  })

  describe('handleDelete', () => {
    it('should delete project when it exists', async () => {
      const project = makeProjectWithDetails()
      await service.handleDelete(project)
      expect(registry.deleteProjectByName).toHaveBeenCalledWith(project.slug)
    })

    it('should not delete project when it does not exist', async () => {
      registry.getProjectByName.mockResolvedValueOnce({ status: 404, data: null })
      await service.handleDelete(makeProjectWithDetails())
      expect(registry.deleteProjectByName).not.toHaveBeenCalled()
    })
  })
})
