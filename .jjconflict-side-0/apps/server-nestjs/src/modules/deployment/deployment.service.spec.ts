import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AppEventsService } from '../events/app-events.service'
import { DeploymentDatastoreService } from './deployment-datastore.service'
import { makeDeployment, makeDeploymentSource, makeDeploymentWithRelations } from './deployment-testing.utils'
import { DeploymentService } from './deployment.service'

describe('deploymentService', () => {
  let module: TestingModule
  let service: DeploymentService
  let datastore: DeepMockProxy<DeploymentDatastoreService>
  let appEvents: DeepMockProxy<AppEventsService>

  const projectId = '11111111-1111-1111-1111-111111111111'
  const userId = 'user-uuid-1234'
  const requestId = 'request-uuid-5678'
  const deploymentId = '22222222-2222-2222-2222-222222222222'

  const okArgoCDResults = { argocd: { status: 'OK' as const, message: 'Up to date', executionTime: 10 } }

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
    appEvents = mockDeep<AppEventsService>()

    module = await Test.createTestingModule({
      providers: [
        DeploymentService,
        { provide: DeploymentDatastoreService, useValue: datastore },
        { provide: AppEventsService, useValue: appEvents },
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
    it('should create deployment and trigger a project reconciliation', async () => {
      const createdDeployment = makeDeployment({ id: deploymentId, projectId })

      datastore.createDeployment.mockResolvedValue(createdDeployment)
      appEvents.emitProjectEvent.mockResolvedValue(okArgoCDResults)

      const result = await service.createDeployment(projectId, validCreateDeployment, userId, requestId)

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

      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, { action: 'Create Deployment', userId, requestId })
      expect(result).toEqual(createdDeployment)
    })

    it('should return the deployment even when the reconciliation fails', async () => {
      const createdDeployment = makeDeployment({ id: deploymentId, projectId })
      datastore.createDeployment.mockResolvedValue(createdDeployment)
      appEvents.emitProjectEvent.mockRejectedValue(new Error('sync error'))

      const result = await service.createDeployment(projectId, validCreateDeployment, userId, requestId)

      expect(result).toEqual(createdDeployment)
    })
  })

  describe('updateDeployment', () => {
    it('should update deployment and trigger a project reconciliation', async () => {
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
      appEvents.emitProjectEvent.mockResolvedValue(okArgoCDResults)

      const result = await service.updateDeployment(projectId, deploymentId, validUpdateDeployment, userId, requestId)

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

      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, { action: 'Update Deployment', userId, requestId })
      expect(result).toEqual(updatedDeployment)
    })

    it('should throw if deployment does not exist', async () => {
      datastore.getDeploymentById.mockResolvedValue(null)

      await expect(
        service.updateDeployment(projectId, deploymentId, validUpdateDeployment, userId, requestId),
      ).rejects.toThrow(`Deployment with id ${deploymentId} not found`)

      expect(datastore.updateDeployment).not.toHaveBeenCalled()
    })

    it('should return the deployment even when the reconciliation fails', async () => {
      const existingDeployment = makeDeploymentWithRelations({
        id: deploymentId,
        projectId,
        deploymentSources: [
          makeDeploymentSource({ id: '55555555-5555-5555-5555-555555555555', deploymentId }),
        ],
      })
      const updatedDeployment = makeDeployment({ id: deploymentId, projectId })
      datastore.getDeploymentById.mockResolvedValue(existingDeployment)
      datastore.updateDeployment.mockResolvedValue(updatedDeployment)
      appEvents.emitProjectEvent.mockRejectedValue(new Error('sync error'))

      const result = await service.updateDeployment(projectId, deploymentId, validUpdateDeployment, userId, requestId)

      expect(result).toEqual(updatedDeployment)
    })
  })

  describe('deleteDeployment', () => {
    it('should delete deployment and trigger a project reconciliation', async () => {
      datastore.deleteDeployment.mockResolvedValue(makeDeployment({ id: deploymentId, projectId }))
      appEvents.emitProjectEvent.mockResolvedValue(okArgoCDResults)

      await service.deleteDeployment(projectId, deploymentId, userId, requestId)

      expect(datastore.deleteDeployment).toHaveBeenCalledWith(deploymentId)
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, { action: 'Delete Deployment', userId, requestId })
    })

    it('should resolve even when the reconciliation fails', async () => {
      datastore.deleteDeployment.mockResolvedValue(makeDeployment({ id: deploymentId, projectId }))
      appEvents.emitProjectEvent.mockRejectedValue(new Error('sync error'))

      await expect(service.deleteDeployment(projectId, deploymentId, userId, requestId)).resolves.toBeUndefined()
    })
  })

  describe('deleteAllDeploymentsByProjectId', () => {
    it('should delete all deployments and upsert project', async () => {
      datastore.deleteAllDeploymentsByProjectId.mockResolvedValue({ count: 1 })

      await service.deleteAllDeploymentsByProjectId(projectId)

      expect(datastore.deleteAllDeploymentsByProjectId).toHaveBeenCalledWith(projectId)
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, { action: 'Delete all project deployments' })
    })
  })
})
