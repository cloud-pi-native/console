import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectDatastoreService } from './project-datastore.service.js'
import { ProjectService } from './project.service.js'

const mockProjectDatastoreService = {
  getProjectWithDetails: vi.fn(),
}

describe('projectService', () => {
  let module: TestingModule
  let service: ProjectService

  const projectId = '11111111-1111-1111-1111-111111111111'

  beforeEach(async () => {
    vi.clearAllMocks()

    module = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: ProjectDatastoreService,
          useValue: mockProjectDatastoreService,
        },
      ],
    }).compile()

    service = module.get<ProjectService>(ProjectService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getProjectWithDetails', () => {
    it('should return project details when project exists', async () => {
      const mockProject = {
        id: projectId,
        name: 'Test Project',
        slug: 'test-project',
        plugins: [],
        repositories: [],
        environments: [],
        deployments: [],
      }

      mockProjectDatastoreService.getProjectWithDetails.mockResolvedValue(mockProject)

      const result = await service.getProjectWithDetails(projectId)

      expect(mockProjectDatastoreService.getProjectWithDetails).toHaveBeenCalledTimes(1)
      expect(mockProjectDatastoreService.getProjectWithDetails).toHaveBeenCalledWith(projectId)
      expect(result).toEqual(mockProject)
    })

    it('should throw an error when project does not exist', async () => {
      mockProjectDatastoreService.getProjectWithDetails.mockResolvedValue(null)

      await expect(service.getProjectWithDetails(projectId)).rejects.toThrow(
        `Project with id ${projectId} not found`,
      )

      expect(mockProjectDatastoreService.getProjectWithDetails).toHaveBeenCalledTimes(1)
      expect(mockProjectDatastoreService.getProjectWithDetails).toHaveBeenCalledWith(projectId)
    })
  })
})
