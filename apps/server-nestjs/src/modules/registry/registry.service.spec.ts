import type { DeepMockProxy } from 'vitest-mock-extended'
import { ENABLED } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { makeVaultSecret } from '../vault/vault-testing.utils'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { makeCreatedResponse, makeNoContent, makeOkResponse, makeProjectWithDetails } from './registry-testing.utils'
import {
  PLUGIN_NAME,
  REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT,
  REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT,
  ROBOT_NAME_PROJECT,
} from './registry.constants'
import { RegistryService } from './registry.service'

describe('registryService', () => {
  let service: RegistryService
  let client: DeepMockProxy<RegistryClientService>
  let datastore: DeepMockProxy<RegistryDatastoreService>
  let vault: DeepMockProxy<VaultClientService>
  let config: DeepMockProxy<ConfigurationService>

  beforeEach(async () => {
    client = mockDeep<RegistryClientService>({
      getProjectByName: vi.fn().mockResolvedValue(makeOkResponse({ project_id: 123, metadata: {} })),
      listQuotas: vi.fn().mockResolvedValue(makeOkResponse([{ ref: { id: 123 }, hard: { storage: -1 } }])),
      getRetentionId: vi.fn().mockResolvedValue(null),
      createRetention: vi.fn().mockResolvedValue(makeCreatedResponse(null)),
      getGroupMembers: vi.fn().mockResolvedValue(makeOkResponse([])),
      getProjectRobots: vi.fn(async function* () {}),
      addGroupMember: vi.fn().mockResolvedValue(makeCreatedResponse(null)),
      removeGroupMember: vi.fn().mockResolvedValue(makeNoContent()),
      deleteProjectByName: vi.fn().mockResolvedValue(makeNoContent()),
    })
    datastore = mockDeep<RegistryDatastoreService>({
      getAdminPluginConfig: vi.fn().mockResolvedValue(null),
    })
    vault = mockDeep<VaultClientService>({
      read: vi.fn().mockResolvedValue(makeVaultSecret({
        data: {
          HOST: 'harbor.example',
          DOCKER_CONFIG: '{}',
          USERNAME: 'robot$myproj+ro-robot',
          TOKEN: 'secret',
        },
      })),
      write: vi.fn().mockResolvedValue(undefined),
    })
    config = mockDeep<ConfigurationService>({
      harborUrl: 'https://harbor.example',
      harborInternalUrl: 'https://harbor.example',
      harborAdmin: 'admin',
      harborAdminPassword: faker.internet.password(),
      harborRuleTemplate: 'latestPushedK',
      harborRuleCount: '10',
      harborRetentionCron: '0 22 2 * * *',
      harborRobotRotationThresholdDays: 90,
      projectRootDir: 'forge',
    })

    const module = await Test.createTestingModule({
      providers: [
        RegistryService,
        { provide: RegistryClientService, useValue: client },
        { provide: RegistryDatastoreService, useValue: datastore },
        { provide: VaultClientService, useValue: vault },
        { provide: ConfigurationService, useValue: config },
      ],
    }).compile()

    service = module.get(RegistryService)
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
        { groupName: `/${project.slug}/console/developer`, roleId: 3 },
        { groupName: `/${project.slug}/console/devops`, roleId: 3 },
        { groupName: `/${project.slug}/console/admin`, roleId: 2 },
      ]

      expect(client.addGroupMember).toHaveBeenCalledTimes(expected.length)
      for (const e of expected) {
        expect(client.addGroupMember).toHaveBeenCalledWith(project.slug, {
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
      client.getGroupMembers.mockResolvedValueOnce(makeOkResponse([
        { id: 10, entity_name: `/${project.slug}/console/admin`, entity_type: 'g', role_id: 3 },
      ]))

      await service.handleUpsert(project)

      expect(client.removeGroupMember).toHaveBeenCalledWith(project.slug, 10)
      expect(client.addGroupMember).toHaveBeenCalledWith(project.slug, {
        role_id: 2,
        member_group: {
          group_name: `/${project.slug}/console/admin`,
          group_type: 3,
        },
      })
    })

    it('returns a KO result when project admin membership creation fails', async () => {
      const project = makeProjectWithDetails()
      client.addGroupMember.mockImplementation(async (_projectName, body) => {
        if (body.member_group.group_name === `/${project.slug}/console/admin` && body.role_id === 2) {
          return { status: 400, data: null }
        }
        return { status: 201, data: null }
      })

      await expect(service.handleUpsert(project)).resolves.toEqual({
        harbor: expect.objectContaining({
          status: 'KO',
          message: expect.stringContaining('Harbor create member failed'),
        }),
      })

      expect(client.addGroupMember).toHaveBeenCalledWith(project.slug, {
        role_id: 2,
        member_group: {
          group_name: `/${project.slug}/console/admin`,
          group_type: 3,
        },
      })
    })

    it('updates quota when it differs', async () => {
      client.listQuotas.mockResolvedValueOnce(makeOkResponse([{ ref: { id: 123 }, hard: { storage: -1 } }]))

      await service.handleUpsert(makeProjectWithDetails({
        slug: 'myproj',
        plugins: [
          { pluginName: PLUGIN_NAME, key: REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT, value: '1024' },
        ],
      }))

      expect(client.updateQuota).toHaveBeenCalledWith(123, 1024)
    })

    it('reuses robot secret when vault secret host matches', async () => {
      const project = makeProjectWithDetails()

      await service.handleUpsert(project)

      expect(vault.read).toHaveBeenCalledTimes(2)
      expect(vault.read).toHaveBeenCalledWith(`forge/${project.slug}/REGISTRY/ro-robot`)
      expect(vault.read).toHaveBeenCalledWith(`forge/${project.slug}/REGISTRY/rw-robot`)
      expect(client.getProjectRobots).not.toHaveBeenCalled()
      expect(client.createRobot).not.toHaveBeenCalled()
      expect(client.deleteRobot).not.toHaveBeenCalled()
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

      client.getProjectRobots.mockImplementation(async function* () {
        yield { id: 11, name: `robot$${project.slug}+ro-robot` }
      })
      client.deleteRobot.mockResolvedValue(makeNoContent())
      client.createRobot.mockResolvedValue(makeCreatedResponse({ id: 22, name: `robot$${project.slug}+ro-robot`, secret: 'newsecret' }))

      await service.handleUpsert(project)

      expect(client.deleteRobot).toHaveBeenCalledWith(11)
      expect(client.createRobot).toHaveBeenCalledWith(expect.objectContaining({ name: 'ro-robot' }))
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

      client.getProjectRobots.mockImplementation(async function* () {
        yield { id: 11, name: `robot$${project.slug}+ro-robot` }
      })
      client.deleteRobot.mockResolvedValue(makeNoContent())
      client.createRobot.mockResolvedValue(makeCreatedResponse({ id: 22, name: `robot$${project.slug}+ro-robot`, secret: 'newsecret' }))

      await service.handleUpsert(project)

      expect(client.deleteRobot).toHaveBeenCalledWith(11)
      expect(client.createRobot).toHaveBeenCalledWith(expect.objectContaining({ name: 'ro-robot' }))
      expect(vault.write).toHaveBeenCalledWith(expect.objectContaining({
        HOST: 'harbor.example',
        USERNAME: `robot$${project.slug}+ro-robot`,
        TOKEN: 'newsecret',
      }), `forge/${project.slug}/REGISTRY/ro-robot`)
    })

    it('parses plugin config and enables project robot publishing', async () => {
      const project = makeProjectWithDetails({
        plugins: [
          { pluginName: PLUGIN_NAME, key: REGISTRY_CONFIG_KEY_QUOTA_HARD_LIMIT, value: '1gb' },
          { pluginName: PLUGIN_NAME, key: REGISTRY_CONFIG_KEY_PUBLISH_PROJECT_ROBOT, value: ENABLED },
        ],
      })
      client.getProjectByName.mockResolvedValue(makeOkResponse({ project_id: 1, metadata: {} }))

      await service.handleUpsert(project)

      expect(client.updateQuota).toHaveBeenCalledWith(1, 1024 ** 3)
      expect(vault.read).toHaveBeenCalledWith(`forge/${project.slug}/REGISTRY/ro-robot`)
      expect(vault.read).toHaveBeenCalledWith(`forge/${project.slug}/REGISTRY/rw-robot`)
      expect(vault.read).toHaveBeenCalledWith(`forge/${project.slug}/REGISTRY/${ROBOT_NAME_PROJECT}`)
    })
  })

  describe('handleCron', () => {
    it('should reconcile all projects', async () => {
      datastore.getAllProjects.mockResolvedValue([
        makeProjectWithDetails({ slug: 'project-1' }),
        makeProjectWithDetails({ slug: 'project-2' }),
      ])

      await service.handleCron()

      expect(client.getGroupMembers).toHaveBeenCalledWith('project-1')
      expect(client.getGroupMembers).toHaveBeenCalledWith('project-2')
    })
  })

  describe('handleDelete', () => {
    it('should delete project when it exists', async () => {
      const project = makeProjectWithDetails()
      await service.handleDelete(project)
      expect(client.deleteProjectByName).toHaveBeenCalledWith(project.slug)
    })

    it('should not delete project when it does not exist', async () => {
      client.getProjectByName.mockResolvedValueOnce({ status: 404, data: null })
      await service.handleDelete(makeProjectWithDetails())
      expect(client.deleteProjectByName).not.toHaveBeenCalled()
    })
  })
})
