import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { ProjectExecutionContext } from '../infrastructure/permission/project/project-context.decorator'
import { InternalServerErrorException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogService } from '../log/log.service'
import { ProjectService } from '../project/project.service'
import { DeploymentDatastoreService } from './deployment-datastore.service'
import { DeploymentService } from './deployment.service'

const mockDeploymentDatastoreService = {
  getDeploymentsByProjectId: vi.fn(),
  createDeployment: vi.fn(),
  getDeploymentById: vi.fn(),
  updateDeployment: vi.fn(),
  deleteDeployment: vi.fn(),
  deleteAllDeploymentsByProjectId: vi.fn(),
}

const mockProjectService = {
  getProjectWithDetails: vi.fn(),
}

const mockEventEmitter = {
  emitAsync: vi.fn(),
}

const mockLogService = {
  addLog: vi.fn(),
}

describe('deploymentService', () => {
  let module: TestingModule
  let service: DeploymentService

  const projectId = '11111111-1111-1111-1111-111111111111'
  const userId = 'user-uuid-1234'
  const requestId = 'request-uuid-5678'
  const deploymentId = '22222222-2222-2222-2222-222222222222'

  const projectCtx: ProjectExecutionContext = { projectId, userId, requestId }

  const mockProject = {
    id: projectId,
    name: 'Test Project',
  }

  const okArgoCDResult = [{ argocd: { status: 'OK', message: 'Up to date', executionTime: 10 } }]
  const koArgoCDResult = [{ argocd: { status: 'KO', message: 'Failed', executionTime: 10, error: new Error('sync error') } }]

  const validCreateDeployment = {
    name: 'mydeployment',
    projectId,
    environmentId: '33333333-3333-3333-3333-333333333333',
    autosync: true,
    deploymentSources: [
      {
        repositoryId: '44444444-4444-4444-4444-444444444444',
        type: 'git',
        targetRevision: 'main',
        path: '/app',
        helmValuesFiles: 'values.yaml',
      },
    ],
  } satisfies CreateDeployment

  const validUpdateDeployment = {
    ...validCreateDeployment,
    deploymentSources: [
      {
        id: '55555555-5555-5555-5555-555555555555',
        repositoryId: '44444444-4444-4444-4444-444444444444',
        type: 'git',
        targetRevision: 'develop',
        path: '/updated-app',
        helmValuesFiles: 'updated-values.yaml',
      },
    ],
  } satisfies UpdateDeployment

  beforeEach(async () => {
    vi.clearAllMocks()

    module = await Test.createTestingModule({
      providers: [
        DeploymentService,
        {
          provide: DeploymentDatastoreService,
          useValue: mockDeploymentDatastoreService,
        },
        {
          provide: ProjectService,
          useValue: mockProjectService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: LogService,
          useValue: mockLogService,
        },
      ],
    }).compile()

    service = module.get<DeploymentService>(DeploymentService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('listByProjectId', () => {
    it('should return deployments by projectId', async () => {
      const deployments = [{ id: deploymentId }]
      mockDeploymentDatastoreService.getDeploymentsByProjectId.mockResolvedValue(deployments)

      const result = await service.listByProjectId(projectId)

      expect(mockDeploymentDatastoreService.getDeploymentsByProjectId).toHaveBeenCalledWith(projectId)
      expect(result).toEqual(deployments)
    })
  })

  describe('createDeployment', () => {
    it('should create deployment and trigger argocd update', async () => {
      const createdDeployment = { id: deploymentId }

      mockDeploymentDatastoreService.createDeployment.mockResolvedValue(createdDeployment)
      mockProjectService.getProjectWithDetails.mockResolvedValue(mockProject)
      mockEventEmitter.emitAsync.mockResolvedValue(okArgoCDResult)
      mockLogService.addLog.mockResolvedValue(undefined)

      const result = await service.createDeployment(projectCtx, validCreateDeployment)

      expect(mockDeploymentDatastoreService.createDeployment).toHaveBeenCalledWith({
        name: validCreateDeployment.name,
        project: { connect: { id: projectId } },
        autosync: validCreateDeployment.autosync,
        environment: { connect: { id: validCreateDeployment.environmentId } },
        deploymentSources: {
          createMany: {
            data: validCreateDeployment.deploymentSources.map(source => ({
              type: source.type,
              repositoryId: source.repositoryId,
              targetRevision: source.targetRevision,
              path: source.path,
              helmValuesFiles: source.helmValuesFiles,
            })),
          },
        },
      })

      expect(mockProjectService.getProjectWithDetails).toHaveBeenCalledWith(projectId)
      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith('project.argocd.update', mockProject)
      expect(mockLogService.addLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'Create Deployment',
        userId,
        requestId,
        projectId,
      }))
      expect(result).toEqual(createdDeployment)
    })

    it('should throw InternalServerErrorException when argocd sync fails', async () => {
      mockDeploymentDatastoreService.createDeployment.mockResolvedValue({ id: deploymentId })
      mockProjectService.getProjectWithDetails.mockResolvedValue(mockProject)
      mockEventEmitter.emitAsync.mockResolvedValue(koArgoCDResult)
      mockLogService.addLog.mockResolvedValue(undefined)

      await expect(service.createDeployment(projectCtx, validCreateDeployment))
        .rejects.toThrow(InternalServerErrorException)

      expect(mockLogService.addLog).toHaveBeenCalled()
    })
  })

  describe('updateDeployment', () => {
    it('should update deployment and trigger argocd update', async () => {
      const existingDeployment = {
        id: deploymentId,
        deploymentSources: [
          { id: '55555555-5555-5555-5555-555555555555' },
          { id: '66666666-6666-6666-6666-666666666666' },
        ],
      }

      const updatedDeployment = { id: deploymentId }

      mockDeploymentDatastoreService.getDeploymentById.mockResolvedValue(existingDeployment)
      mockDeploymentDatastoreService.updateDeployment.mockResolvedValue(updatedDeployment)
      mockProjectService.getProjectWithDetails.mockResolvedValue(mockProject)
      mockEventEmitter.emitAsync.mockResolvedValue(okArgoCDResult)
      mockLogService.addLog.mockResolvedValue(undefined)

      const result = await service.updateDeployment(projectCtx, deploymentId, validUpdateDeployment)

      expect(mockDeploymentDatastoreService.updateDeployment).toHaveBeenCalledWith(
        deploymentId,
        expect.objectContaining({
          name: validUpdateDeployment.name,
          deploymentSources: {
            deleteMany: {
              id: { in: ['66666666-6666-6666-6666-666666666666'] },
            },
            upsert: expect.any(Array),
          },
        }),
      )

      expect(mockProjectService.getProjectWithDetails).toHaveBeenCalledWith(projectId)
      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith('project.argocd.update', mockProject)
      expect(mockLogService.addLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'Update Deployment',
        userId,
        requestId,
        projectId,
      }))
      expect(result).toEqual(updatedDeployment)
    })

    it('should throw if deployment does not exist', async () => {
      mockDeploymentDatastoreService.getDeploymentById.mockResolvedValue(null)

      await expect(
        service.updateDeployment(projectCtx, deploymentId, validUpdateDeployment),
      ).rejects.toThrow(`Deployment with id ${deploymentId} not found`)

      expect(mockDeploymentDatastoreService.updateDeployment).not.toHaveBeenCalled()
    })

    it('should throw InternalServerErrorException when argocd sync fails', async () => {
      const existingDeployment = {
        id: deploymentId,
        deploymentSources: [{ id: '55555555-5555-5555-5555-555555555555' }],
      }
      mockDeploymentDatastoreService.getDeploymentById.mockResolvedValue(existingDeployment)
      mockDeploymentDatastoreService.updateDeployment.mockResolvedValue({ id: deploymentId })
      mockProjectService.getProjectWithDetails.mockResolvedValue(mockProject)
      mockEventEmitter.emitAsync.mockResolvedValue(koArgoCDResult)
      mockLogService.addLog.mockResolvedValue(undefined)

      await expect(service.updateDeployment(projectCtx, deploymentId, validUpdateDeployment))
        .rejects.toThrow(InternalServerErrorException)
    })
  })

  describe('deleteDeployment', () => {
    it('should delete deployment and trigger argocd update', async () => {
      mockDeploymentDatastoreService.deleteDeployment.mockResolvedValue(undefined)
      mockProjectService.getProjectWithDetails.mockResolvedValue(mockProject)
      mockEventEmitter.emitAsync.mockResolvedValue(okArgoCDResult)
      mockLogService.addLog.mockResolvedValue(undefined)

      await service.deleteDeployment(projectCtx, deploymentId)

      expect(mockDeploymentDatastoreService.deleteDeployment).toHaveBeenCalledWith(deploymentId)
      expect(mockProjectService.getProjectWithDetails).toHaveBeenCalledWith(projectId)
      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith('project.argocd.update', mockProject)
      expect(mockLogService.addLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'Delete Deployment',
        userId,
        requestId,
        projectId,
      }))
    })

    it('should throw InternalServerErrorException when argocd sync fails', async () => {
      mockDeploymentDatastoreService.deleteDeployment.mockResolvedValue(undefined)
      mockProjectService.getProjectWithDetails.mockResolvedValue(mockProject)
      mockEventEmitter.emitAsync.mockResolvedValue(koArgoCDResult)
      mockLogService.addLog.mockResolvedValue(undefined)

      await expect(service.deleteDeployment(projectCtx, deploymentId))
        .rejects.toThrow(InternalServerErrorException)
    })
  })
})
