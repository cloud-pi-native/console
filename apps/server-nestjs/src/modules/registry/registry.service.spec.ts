import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { ENABLED } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { baseConfigFactory } from '../../config/base.config'
import { harborConfigFactory } from '../../config/harbor.config'
import { vaultConfigFactory } from '../../config/vault.config'
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
  let harborConfig: DeepMockProxy<ConfigType<typeof harborConfigFactory>>
  let baseConfig: DeepMockProxy<ConfigType<typeof baseConfigFactory>>
  let vaultConfig: DeepMockProxy<ConfigType<typeof vaultConfigFactory>>

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
    harborConfig = mockDeep<ConfigType<typeof harborConfigFactory>>({
      url: 'https://harbor.example',
      internalUrl: 'https://harbor.example',
      admin: 'admin',
      adminPassword: faker.internet.password(),
      ruleTemplate: 'latestPushedK',
      ruleCount: 10,
      retentionCron: '0 22 2 * * *',
      robotRotationThresholdDays: 90,
    })
    baseConfig = mockDeep<ConfigType<typeof baseConfigFactory>>({
      projectsRootDir: 'forge',
    })
    vaultConfig = mockDeep<ConfigType<typeof vaultConfigFactory>>({})

    const module = await Test.createTestingModule({
      providers: [
        RegistryService,
        { provide: RegistryClientService, useValue: client },
        { provide: RegistryDatastoreService, useValue: datastore },
        { provide: VaultClientService, useValue: vault },
        { provide: harborConfigFactory.KEY, useValue: harborConfig },
        { provide: baseConfigFactory.KEY, useValue: baseConfig },
        { provide: vaultConfigFactory.KEY, useValue: vaultConfig },
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
          return { status: HttpStatus.BAD_REQUEST, data: null }
        }
        return { status: HttpStatus.CREATED, data: null }
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
      client.getProjectByName.mockResolvedValueOnce({ status: HttpStatus.NOT_FOUND, data: null })
      await service.handleDelete(makeProjectWithDetails())
      expect(client.deleteProjectByName).not.toHaveBeenCalled()
    })
  })

  describe('external-call error paths (409 / transient 5xx / cleanup)', () => {
    // Legacy contracts: plugins/harbor/src/project.ts:32 createProject GETs first with
    // validateStatus:()=>true and :60 deleteProject treats 404 as already-gone.
    // Current RegistryService mirrors this and forwards 4xx/5xx once (no retry).

    it('handleUpsert does not recreate an existing Harbor project (idempotent, avoids 409)', async () => {
      const project = makeProjectWithDetails()
      client.getProjectByName.mockResolvedValue(makeOkResponse({ project_id: 123, metadata: {} }))

      await service.handleUpsert(project)

      expect(client.createProject).not.toHaveBeenCalled()
    })

    it('handleUpsert propagates a 409 conflict from project creation as a KO result', async () => {
      const project = makeProjectWithDetails()
      client.getProjectByName.mockResolvedValueOnce({ status: HttpStatus.NOT_FOUND, data: null })
      client.createProject.mockResolvedValueOnce({ status: 409, data: null })

      const result = await service.handleUpsert(project)
      // Legacy contract: plugins/harbor/src/project.ts:32 GETs first, so a 409 only occurs in a
      // race; the legacy createProject surfaces it as an error too. Current behaviour matches.
      expect(result.harbor.status).toBe('KO')
    })

    it('handleUpsert propagates a transient 5xx (502) from project creation as KO without retrying', async () => {
      const project = makeProjectWithDetails()
      client.getProjectByName.mockResolvedValueOnce({ status: HttpStatus.NOT_FOUND, data: null })
      client.createProject.mockResolvedValueOnce({ status: 502, data: null })

      const result = await service.handleUpsert(project)
      // No retry logic exists in RegistryHttpClientService.fetch; 5xx forwarded once.
      expect(result.harbor.status).toBe('KO')
    })

    it('handleDelete treats a 404 on project deletion as already-gone (idempotent, returns OK)', async () => {
      const project = makeProjectWithDetails()
      client.getProjectByName.mockResolvedValueOnce(makeOkResponse({ project_id: 123, metadata: {} }))
      client.deleteProjectByName.mockResolvedValueOnce({ status: HttpStatus.NOT_FOUND, data: null })

      const result = await service.handleDelete(project)
      // Mirrors legacy deleteProject (project.ts:60) which swallows 404 on the already-gone resource.
      expect(result.harbor.status).toBe('OK')
    })

    it('handleDelete returns KO when deleting the Harbor project fails with a 5xx', async () => {
      const project = makeProjectWithDetails()
      client.getProjectByName.mockResolvedValueOnce(makeOkResponse({ project_id: 123, metadata: {} }))
      client.deleteProjectByName.mockResolvedValueOnce({ status: HttpStatus.INTERNAL_SERVER_ERROR, data: null })

      const result = await service.handleDelete(project)
      expect(result.harbor.status).toBe('KO')
    })
  })
})
