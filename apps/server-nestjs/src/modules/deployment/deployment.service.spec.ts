import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeProjectWithDetails } from '../project/project-testing.utils'
import { ProjectService } from '../project/project.service'
import { DeploymentDatastoreService } from './deployment-datastore.service'
import { makeDeployment, makeDeploymentSource, makeDeploymentWithRelations } from './deployment-testing.utils'
import { DeploymentService } from './deployment.service'

describe('deploymentService', () => {
  let module: TestingModule
  let service: DeploymentService
  let datastore: DeepMockProxy<DeploymentDatastoreService>
  let projectService: DeepMockProxy<ProjectService>
  let events: DeepMockProxy<EventEmitter2>

  const projectId = '11111111-1111-1111-1111-111111111111'
  const deploymentId = '22222222-2222-2222-2222-222222222222'

  const mockProject = makeProjectWithDetails({ id: projectId })

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
    datastore = mockDeep<DeploymentDatastoreService>()
    projectService = mockDeep<ProjectService>()
    events = mockDeep<EventEmitter2>()

    module = await Test.createTestingModule({
      providers: [
        DeploymentService,
        { provide: DeploymentDatastoreService, useValue: datastore },
        { provide: ProjectService, useValue: projectService },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile()

    service = module.get<DeploymentService>(DeploymentService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('listByProjectId', () => {
    it('should return deployments by projectId', async () => {
      const deployments = [makeDeploymentWithRelations({ id: deploymentId, projectId })]
      datastore.getDeploymentsByProjectId.mockResolvedValue(deployments)

      const result = await service.listByProjectId(projectId)

      expect(datastore.getDeploymentsByProjectId).toHaveBeenCalledWith(projectId)
      expect(result).toEqual(deployments)
    })
  })

  describe('createDeployment', () => {
    it('should create deployment and upsert project', async () => {
      const createdDeployment = makeDeployment({ id: deploymentId, projectId })

      datastore.createDeployment.mockResolvedValue(createdDeployment)
      projectService.get.mockResolvedValue(mockProject)
      events.emitAsync.mockResolvedValue([])

      const result = await service.createDeployment(projectId, validCreateDeployment)

      expect(datastore.createDeployment).toHaveBeenCalledWith({
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

      expect(projectService.get).toHaveBeenCalledWith(projectId)
      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', mockProject)
      expect(result).toEqual(createdDeployment)
    })
  })

  describe('updateDeployment', () => {
    it('should update deployment and upsert project', async () => {
      const existingDeployment = makeDeploymentWithRelations({
        id: deploymentId,
        projectId,
        deploymentSources: [
          makeDeploymentSource({ id: '55555555-5555-5555-5555-555555555555', deploymentId }),
          makeDeploymentSource({ id: '66666666-6666-6666-6666-666666666666', deploymentId }),
        ],
      })

      const updatedDeployment = makeDeployment({ id: deploymentId, projectId })

      datastore.getDeploymentById.mockResolvedValue(existingDeployment)
      datastore.updateDeployment.mockResolvedValue(updatedDeployment)
      projectService.get.mockResolvedValue(mockProject)
      events.emitAsync.mockResolvedValue([])

      const result = await service.updateDeployment(deploymentId, validUpdateDeployment)

      expect(datastore.updateDeployment).toHaveBeenCalledWith(
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

      expect(projectService.get).toHaveBeenCalledWith(validUpdateDeployment.projectId)
      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', mockProject)
      expect(result).toEqual(updatedDeployment)
    })

    it('should throw if deployment does not exist', async () => {
      datastore.getDeploymentById.mockResolvedValue(null)

      await expect(
        service.updateDeployment(deploymentId, validUpdateDeployment),
      ).rejects.toThrow(`Deployment with id ${deploymentId} not found`)

      expect(datastore.updateDeployment).not.toHaveBeenCalled()
    })
  })

  describe('deleteDeployment', () => {
    it('should delete deployment and upsert project', async () => {
      datastore.deleteDeployment.mockResolvedValue(makeDeployment({ id: deploymentId, projectId }))
      projectService.get.mockResolvedValue(mockProject)
      events.emitAsync.mockResolvedValue([])

      await service.deleteDeployment(deploymentId)

      expect(datastore.deleteDeployment).toHaveBeenCalledWith(deploymentId)
      expect(projectService.get).toHaveBeenCalledWith(projectId)
      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', mockProject)
    })
  })

  describe('deleteAllDeploymentsByProjectId', () => {
    it('should delete all deployments and upsert project', async () => {
      datastore.deleteAllDeploymentsByProjectId.mockResolvedValue({ count: 1 })
      projectService.get.mockResolvedValue(mockProject)
      events.emitAsync.mockResolvedValue([])

      await service.deleteAllDeploymentsByProjectId(projectId)

      expect(datastore.deleteAllDeploymentsByProjectId).toHaveBeenCalledWith(projectId)
      expect(projectService.get).toHaveBeenCalledWith(projectId)
      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', mockProject)
    })
  })
})
