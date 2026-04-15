import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { DeploymentDatastoreService } from './deployment-datastore.service'

const mockDeployment = {
  name: 'dep1',
  id: 'dep1',
  projectId: 'id',
  memory: 3,
  cpu: 1,
  gpu: 0,
  autosync: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  environmentId: 'envId',
}

describe('deploymentDatastoreService', () => {
  let module: TestingModule
  let service: DeploymentDatastoreService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    module = await Test.createTestingModule({
      providers: [
        DeploymentDatastoreService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(DeploymentDatastoreService)
  })

  describe('getDeploymentById', () => {
    it('should return a deployment with sources and repository', async () => {
      const deployment = { ...mockDeployment }

      prisma.deployment.findUnique.mockResolvedValue(deployment)

      const result = await service.getDeploymentById('dep1')

      expect(prisma.deployment.findUnique).toHaveBeenCalledWith({
        where: { id: 'dep1' },
        include: {
          environment: true,
          deploymentSources: {
            include: { repository: true },
          },
        },
      })
      expect(result).toEqual(deployment)
    })
  })

  describe('getDeploymentsByProjectId', () => {
    it('should return deployments for a project', async () => {
      const deployments = [{ ...mockDeployment }]

      prisma.deployment.findMany.mockResolvedValue(deployments as any)

      const result = await service.getDeploymentsByProjectId('project1')

      expect(prisma.deployment.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project1' },
        include: {
          environment: true,
          deploymentSources: {
            include: { repository: true },
          },
        },
      })
      expect(result).toEqual(deployments)
    })
  })

  describe('createDeployment', () => {
    it('should create a deployment', async () => {
      const created = {
        ...mockDeployment,
        name: 'test',
      }

      const data = {
        ...created,
        project: { connect: { id: 'id' } },
        environment: { connect: { id: 'envId' } },
      }

      prisma.deployment.create.mockResolvedValue(data)

      const result = await service.createDeployment({
        ...data,
      })

      expect(prisma.deployment.create).toHaveBeenCalledWith({ data })
      expect(result).toEqual(data)
    })
  })

  describe('updateDeployment', () => {
    it('should update a deployment', async () => {
      const updated = { ...mockDeployment, name: 'updated' }

      prisma.deployment.update.mockResolvedValue(updated as any)

      const result = await service.updateDeployment('dep1', {
        ...mockDeployment,
        name: 'updated',
      })

      expect(prisma.deployment.update).toHaveBeenCalledWith({
        where: { id: 'dep1' },
        data: { ...mockDeployment, name: 'updated' },
      })
      expect(result).toEqual(updated)
    })
  })

  describe('deleteDeployment', () => {
    it('should delete a deployment', async () => {
      const deleted = { ...mockDeployment }

      prisma.deployment.delete.mockResolvedValue(deleted as any)

      const result = await service.deleteDeployment('dep1')

      expect(prisma.deployment.delete).toHaveBeenCalledWith({
        where: { id: 'dep1' },
      })
      expect(result).toEqual(deleted)
    })
  })

  describe('deleteAllDeploymentsByProjectId', () => {
    it('should delete all deployments for a project', async () => {
      const response = { count: 3 }

      prisma.deployment.deleteMany.mockResolvedValue(response)

      const result = await service.deleteAllDeploymentsByProjectId('project1')

      expect(prisma.deployment.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'project1' },
      })
      expect(result).toEqual(response)
    })
  })
})
