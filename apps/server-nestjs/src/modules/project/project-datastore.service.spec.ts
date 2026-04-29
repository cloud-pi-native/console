import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrismaService } from '../infrastructure/database/prisma.service.js'
import { ProjectDatastoreService } from './project-datastore.service.js'

const mockPrismaService = {
  project: {
    findUnique: vi.fn(),
  },
}

describe('projectDatastoreService', () => {
  let module: TestingModule
  let service: ProjectDatastoreService

  const projectId = '11111111-1111-1111-1111-111111111111'

  beforeEach(async () => {
    vi.clearAllMocks()

    module = await Test.createTestingModule({
      providers: [
        ProjectDatastoreService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<ProjectDatastoreService>(ProjectDatastoreService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getProjectWithDetails', () => {
    it('should call prisma.project.findUnique with correct project id and selection', async () => {
      const mockProject = {
        id: projectId,
        name: 'Test Project',
        slug: 'test-project',
        plugins: [],
        repositories: [],
        environments: [],
        deployments: [],
      }

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)

      const result = await service.getProjectWithDetails(projectId)

      expect(mockPrismaService.project.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: projectId },
          select: expect.objectContaining({
            id: true,
            name: true,
            slug: true,
            plugins: expect.any(Object),
            repositories: expect.any(Object),
            environments: expect.any(Object),
            deployments: expect.any(Object),
          }),
        }),
      )

      expect(result).toEqual(mockProject)
    })

    it('should return null if project is not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null)

      const result = await service.getProjectWithDetails(projectId)

      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: projectId },
        }),
      )

      expect(result).toBeNull()
    })
  })
})
