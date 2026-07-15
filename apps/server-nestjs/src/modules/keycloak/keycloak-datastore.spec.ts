import type { DeepMockProxy } from 'vitest-mock-extended'
import { ENABLED } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { makeProject, makeProjectPlugin } from './keycloak-testing.utils'
import { AUTO_SYNC_PLUGIN_KEY, PLUGIN_NAME } from './keycloak.constants'

describe('keycloakDatastoreService', () => {
  let service: KeycloakDatastoreService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    const module = await Test.createTestingModule({
      providers: [KeycloakDatastoreService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = module.get(KeycloakDatastoreService)
  })

  describe('getAutoSyncProjects', () => {
    it('should return projects with autoSync enabled and not suspended', async () => {
      const autoSyncPlugin = makeProjectPlugin({ pluginName: PLUGIN_NAME, key: AUTO_SYNC_PLUGIN_KEY, value: ENABLED })
      const project1 = makeProject({ id: 'project-1', slug: 'project-1', plugins: [autoSyncPlugin] })
      const project2 = makeProject({ id: 'project-2', slug: 'project-2', plugins: [autoSyncPlugin] })

      prisma.project.findMany.mockResolvedValue([project1, project2])

      const result = await service.getAutoSyncProjects()

      expect(result).toHaveLength(2)
      expect(result.map(p => p.id)).toEqual(['project-1', 'project-2'])
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        select: expect.anything(),
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
    })

    it('should return empty array when no projects match criteria', async () => {
      prisma.project.findMany.mockResolvedValue([])

      const result = await service.getAutoSyncProjects()

      expect(result).toEqual([])
    })

    it('should exclude suspended projects and projects without autoSync', async () => {
      const autoSyncPlugin = makeProjectPlugin({ pluginName: PLUGIN_NAME, key: AUTO_SYNC_PLUGIN_KEY, value: ENABLED })
      const autoSyncProject = makeProject({ id: 'project-auto', slug: 'project-auto', plugins: [autoSyncPlugin] })

      prisma.project.findMany.mockResolvedValue([autoSyncProject])

      const result = await service.getAutoSyncProjects()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('project-auto')
    })
  })
})
