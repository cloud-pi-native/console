import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { ENABLED } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { makeAdminPlugin, makeAdminRole, makeProject, makeUser } from './gitlab-testing.utils'
import { AUTO_SYNC_PLUGIN_KEY, PLUGIN_NAME } from './gitlab.constants'

describe('gitlabDatastoreService', () => {
  let module: TestingModule
  let service: GitlabDatastoreService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    module = await Test.createTestingModule({
      providers: [
        GitlabDatastoreService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(GitlabDatastoreService)
  })

  describe('getAllProjects', () => {
    it('should return all projects with gitlab plugin', async () => {
      const mockProject = makeProject({
        id: 'project1',
        name: 'Test Project',
        slug: 'test-project',
        description: 'Test',
      })

      prisma.project.findMany.mockResolvedValue([mockProject])

      const result = await service.getAllProjects()

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        select: expect.any(Object),
        where: {
          plugins: {
            some: {
              pluginName: PLUGIN_NAME,
            },
          },
        },
      })
      expect(result).toEqual([mockProject])
    })
  })

  describe('getAutoSyncProjects', () => {
    it('should return projects with autoSync enabled and not suspended', async () => {
      const mockProject = makeProject({
        id: 'project1',
        name: 'Test Project',
        slug: 'test-project',
        description: 'Test',
      })

      prisma.project.findMany.mockResolvedValue([mockProject])

      const result = await service.getAutoSyncProjects()

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        select: expect.any(Object),
        where: {
          AND: [
            {
              plugins: {
                some: {
                  pluginName: PLUGIN_NAME,
                  key: AUTO_SYNC_PLUGIN_KEY,
                  value: ENABLED,
                },
              },
            },
            {
              NOT: {
                plugins: {
                  some: {
                    pluginName: PLUGIN_NAME,
                    key: 'suspended',
                    value: ENABLED,
                  },
                },
              },
            },
          ],
        },
      })
      expect(result).toEqual([mockProject])
    })

    it('should return empty array when no projects match criteria', async () => {
      prisma.project.findMany.mockResolvedValue([])

      const result = await service.getAutoSyncProjects()

      expect(result).toEqual([])
    })
  })

  describe('getProject', () => {
    it('should return a project by id', async () => {
      const mockProject = makeProject({
        id: 'project1',
        name: 'Test Project',
        slug: 'test-project',
        description: 'Test',
      })

      prisma.project.findUnique.mockResolvedValue(mockProject)

      const result = await service.getProject('project1')

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project1' },
        select: expect.any(Object),
      })
      expect(result).toEqual(mockProject)
    })

    it('should return null when project not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null)

      const result = await service.getProject('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getAdminPluginConfig', () => {
    it('should return admin plugin config value', async () => {
      const config = makeAdminPlugin({ value: 'test-value' })
      prisma.adminPlugin.findUnique.mockResolvedValue(config)

      const result = await service.getAdminPluginConfig(PLUGIN_NAME, 'token')

      expect(prisma.adminPlugin.findUnique).toHaveBeenCalledWith({
        where: {
          pluginName_key: {
            pluginName: PLUGIN_NAME,
            key: 'token',
          },
        },
        select: {
          value: true,
        },
      })
      expect(result).toEqual('test-value')
    })

    it('should return null when config not found', async () => {
      prisma.adminPlugin.findUnique.mockResolvedValue(null)

      const result = await service.getAdminPluginConfig(PLUGIN_NAME, 'missing')

      expect(result).toBeNull()
    })
  })

  describe('getAdminRolesByOidcGroups', () => {
    it('should return admin roles for given oidc groups', async () => {
      const roles = [
        makeAdminRole({ id: 'role1', oidcGroup: 'group1' }),
        makeAdminRole({ id: 'role2', oidcGroup: 'group2' }),
      ]

      prisma.adminRole.findMany.mockResolvedValue(roles)

      const result = await service.getAdminRolesByOidcGroups(['group1', 'group2'])

      expect(prisma.adminRole.findMany).toHaveBeenCalledWith({
        where: {
          oidcGroup: {
            in: ['group1', 'group2'],
          },
        },
        select: {
          id: true,
          oidcGroup: true,
        },
      })
      expect(result).toEqual(roles)
    })
  })

  describe('getUser', () => {
    it('should return a user by id', async () => {
      const user = makeUser({
        id: 'user1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      })

      prisma.user.findUnique.mockResolvedValue(user)

      const result = await service.getUser('user1')

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'user1',
        },
      })
      expect(result).toEqual(user)
    })
  })
})
