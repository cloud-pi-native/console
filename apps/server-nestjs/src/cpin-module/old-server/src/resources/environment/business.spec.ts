import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cluster, Environment, Project, ProjectMembers, ProjectRole, Stage, User } from '@prisma/client'
import prisma from '../../__mocks__/prisma'
import { hook } from '../../__mocks__/utils/hook-wrapper'
import { checkClusterResources, checkProjectResources, createEnvironment, deleteEnvironment, getProjectEnvironments, updateEnvironment } from './business'
import { Result } from '../../utils/business'

vi.mock('../../utils/hook-wrapper', async () => ({
  hook,
}))

const user: User = {
  id: faker.string.uuid(),
  createdAt: new Date(),
  updatedAt: new Date(),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  adminRoleIds: [],
  type: 'human',
  lastLogin: null,
}
const project: Project & {
  clusters: Pick<Cluster, 'id'>[]
  members: ProjectMembers[]
  roles: ProjectRole[]
  owner: User
} = {
  createdAt: new Date(),
  updatedAt: new Date(),
  description: '',
  everyonePerms: 649n,
  id: faker.string.uuid(),
  locked: false,
  name: faker.string.alphanumeric(8),
  status: 'created',
  ownerId: faker.string.uuid(),
  owner: user,
  limitless: false,
  hprodCpu: faker.number.int({ min: 0, max: 1000 }),
  hprodGpu: faker.number.int({ min: 0, max: 1000 }),
  hprodMemory: faker.number.int({ min: 0, max: 1000 }),
  prodCpu: faker.number.int({ min: 0, max: 1000 }),
  prodGpu: faker.number.int({ min: 0, max: 1000 }),
  prodMemory: faker.number.int({ min: 0, max: 1000 }),
  clusters: [],
  roles: [],
  members: [],
  slug: faker.string.alphanumeric(8),
  lastSuccessProvisionningVersion: faker.string.numeric(),
}

describe('test environment business', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getProjectEnvironments', () => {
    it('should query environment for projectId', async () => {
      prisma.environment.findMany.mockResolvedValue([])
      const projectId = faker.string.uuid()
      await getProjectEnvironments(projectId)

      expect(prisma.environment.findMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('createEnvironment', () => {
    const clusterId = faker.string.uuid()
    const stageId = faker.string.uuid()
    const env = { name: 'new-env' }
    it('should create environment and trigger hook', async () => {
      const requestId = faker.string.uuid()
      const stageId = faker.string.uuid()

      prisma.environment.create.mockResolvedValue({ clusterId } as Environment)
      hook.project.upsert.mockResolvedValue({ results: {}, project: { ...project } })

      const result = await createEnvironment({
        userId: user.id,
        projectId: project.id,
        name: env.name,
        cpu: 0.1,
        gpu: 0.5,
        memory: 2.0,
        clusterId,
        stageId,
        requestId,
      })

      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(prisma.environment.create).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeTruthy()
    })

    it('should create environment and trigger hook but hooks failed', async () => {
      const requestId = faker.string.uuid()

      prisma.environment.create.mockResolvedValue({ clusterId } as Environment)
      hook.project.upsert.mockResolvedValue({ results: { failed: true }, project: { ...project } })

      const result = await createEnvironment({
        userId: user.id,
        projectId: project.id,
        name: env.name,
        cpu: 0.1,
        gpu: 0.5,
        memory: 2.0,
        clusterId,
        stageId,
        requestId,
      })

      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(prisma.environment.create).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeFalsy()
    })
  })

  describe('updateEnvironment', () => {
    it('should update environment and trigger hook', async () => {
      const requestId = faker.string.uuid()
      const environmentId = faker.string.uuid()

      prisma.environment.update.mockResolvedValue({ projectId: project.id } as Environment)
      hook.project.upsert.mockResolvedValue({ results: {}, project: { ...project } })

      const result = await updateEnvironment({
        user,
        environmentId,
        requestId,
        cpu: 2.0,
        gpu: 4.0,
        memory: 12.5,
      })

      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(prisma.environment.update).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeTruthy()
    })

    it('should update environment and trigger hook but hooks failed', async () => {
      const requestId = faker.string.uuid()
      const environmentId = faker.string.uuid()

      prisma.environment.update.mockResolvedValue({ projectId: project.id } as Environment)
      hook.project.upsert.mockResolvedValue({ results: { failed: true }, project: { ...project } })

      const result = await updateEnvironment({
        user,
        environmentId,
        requestId,
        cpu: 2.0,
        gpu: 4.0,
        memory: 12.5,
      })

      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(prisma.environment.update).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeFalsy()
    })
  })

  describe('deleteEnvironment', () => {
    it('should delete environment and trigger hook', async () => {
      const requestId = faker.string.uuid()
      const environmentId = faker.string.uuid()

      prisma.environment.delete.mockResolvedValue({ projectId: project.id } as Environment)
      hook.project.upsert.mockResolvedValue({ results: {}, project: { ...project } })

      const result = await deleteEnvironment({ environmentId, userId: user.id, projectId: project.id, requestId })

      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(prisma.environment.delete).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeTruthy()
    })

    it('should delete environment and trigger hook but hooks failed', async () => {
      const requestId = faker.string.uuid()
      const environmentId = faker.string.uuid()

      prisma.environment.delete.mockResolvedValue({ projectId: project.id } as Environment)
      hook.project.upsert.mockResolvedValue({ results: { failed: true }, project: { ...project } })

      const result = await deleteEnvironment({ environmentId, userId: user.id, projectId: project.id, requestId })

      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(prisma.environment.delete).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeFalsy()
    })
  })

  describe('checkClusterResources', () => {
    it('should authorize cluster not yet configured', async () => {
      const cluster: Cluster = {
        cpu: 0,
        gpu: 0,
        memory: 0,
      } as Cluster
      const result = await checkClusterResources({ cpu: 1, gpu: 0, memory: 1 }, cluster)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeTruthy()
    })
    it('should authorize cluster not yet used', async () => {
      const cluster: Cluster = {
        cpu: 10,
        gpu: 0,
        memory: 8,
      } as Cluster
      prisma.environment.aggregate.mockResolvedValue({
        _sum: {
          cpu: 0,
          gpu: 0,
          memory: 0,
        },
      } as any)
      const result = await checkClusterResources({ cpu: 8, gpu: 0, memory: 7 }, cluster)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeTruthy()
    })
    it('should authorize cluster used but not full', async () => {
      const cluster: Cluster = {
        cpu: 10,
        gpu: 0,
        memory: 8,
      } as Cluster
      prisma.environment.aggregate.mockResolvedValue({
        _sum: {
          cpu: 2,
          gpu: 0,
          memory: 2,
        },
      } as any)
      const result = await checkClusterResources({ cpu: 8, gpu: 0, memory: 6 }, cluster)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeTruthy()
    })
    it('should refuse cluster without enough space', async () => {
      const cluster: Cluster = {
        cpu: 10,
        gpu: 0,
        memory: 8,
      } as Cluster
      prisma.environment.aggregate.mockResolvedValue({
        _sum: {
          cpu: 5,
          gpu: 0,
          memory: 5,
        },
      } as any)
      const result = await checkClusterResources({ cpu: 8, gpu: 0, memory: 6 }, cluster)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeFalsy()
      expect(result.error).toEqual('Le cluster ne dispose pas de suffisamment de ressources : CPU, Mémoire.')
    })
    it('should refuse cluster without GPU', async () => {
      const cluster: Cluster = {
        cpu: 10,
        gpu: 0,
        memory: 8,
      } as Cluster
      prisma.environment.aggregate.mockResolvedValue({
        _sum: {
          cpu: 2,
          gpu: 0,
          memory: 2,
        },
      } as any)
      const result = await checkClusterResources({ cpu: 2, gpu: 1, memory: 2 }, cluster)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeFalsy()
      expect(result.error).toEqual('Le cluster ne dispose pas de suffisamment de ressources : GPU.')
    })
  })

  describe('checkProjectResources', () => {
    const prodStage: Stage = {
      id: faker.string.uuid(),
      name: 'prod',
    }
    const hprodStage: Stage = {
      id: faker.string.uuid(),
      name: 'hprod',
    }
    it('should authorize prod deployment for project with hprod resource but no prod resources', async () => {
      const project: Project = {
        hprodCpu: 10,
        hprodGpu: 10,
        hprodMemory: 10,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
      } as Project
      prisma.stage.findUnique.mockResolvedValue(prodStage)
      prisma.stage.findMany.mockResolvedValue([prodStage])
      const result = await checkProjectResources({ cpu: 1, gpu: 0, memory: 1, stageId: prodStage.id }, project)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeTruthy()
    })
    it('should refuse hprod deployment for project with hprod resource but no prod resources', async () => {
      const project: Project = {
        hprodCpu: 10,
        hprodGpu: 10,
        hprodMemory: 10,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
      } as Project
      prisma.stage.findUnique.mockResolvedValue(hprodStage)
      prisma.stage.findMany.mockResolvedValue([prodStage] as Stage[])
      prisma.environment.aggregate.mockResolvedValue({
        _sum: { cpu: 0, gpu: 0, memory: 0 },
      } as any)
      const result = await checkProjectResources({ cpu: 20, gpu: 20, memory: 20, stageId: hprodStage.id }, project)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeFalsy()
      expect(result.error).toEqual('Le projet ne dispose pas de suffisamment de ressources : CPU, GPU, Mémoire.')
    })
    it('should refuse overloading hprod deployment', async () => {
      const project: Project = {
        hprodCpu: 20,
        hprodGpu: 20,
        hprodMemory: 20,
        prodCpu: 10,
        prodGpu: 10,
        prodMemory: 10,
      } as Project
      prisma.stage.findUnique.mockResolvedValue(hprodStage)
      prisma.stage.findMany.mockResolvedValue([prodStage] as Stage[])
      prisma.environment.aggregate.mockResolvedValue({
        _sum: { cpu: 15, gpu: 15, memory: 15 },
      } as any)
      const result = await checkProjectResources({ cpu: 5, gpu: 6, memory: 5, stageId: hprodStage.id }, project)
      expect(result).toBeInstanceOf(Result)
      expect(result.success).toBeFalsy()
      expect(result.error).toEqual('Le projet ne dispose pas de suffisamment de ressources : GPU.')
    })
  })
})
