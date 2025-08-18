import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cluster, Environment, Project, ProjectMembers, ProjectRole, User } from '@prisma/client'
import prisma from '../../__mocks__/prisma.js'
import { hook } from '../../__mocks__/utils/hook-wrapper.ts'
import { createEnvironment, deleteEnvironment, getProjectEnvironments, updateEnvironment } from './business.ts'
import { ErrorResType } from '../../utils/errors.ts'

vi.mock('../../utils/hook-wrapper.ts', async () => ({
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

      await createEnvironment({
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
    })

    it('should create quota and trigger hook but hooks failed', async () => {
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
      expect(result).toBeInstanceOf(ErrorResType)
    })
  })

  describe('updateEnvironment', () => {
    it('should update environment and trigger hook', async () => {
      const requestId = faker.string.uuid()
      const environmentId = faker.string.uuid()

      prisma.environment.update.mockResolvedValue({ projectId: project.id } as Environment)
      hook.project.upsert.mockResolvedValue({ results: {}, project: { ...project } })

      await updateEnvironment({
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
      expect(result).toBeInstanceOf(ErrorResType)
    })
  })

  describe('deleteEnvironment', () => {
    it('should update quota and trigger hook', async () => {
      const requestId = faker.string.uuid()
      const environmentId = faker.string.uuid()

      prisma.environment.delete.mockResolvedValue({ projectId: project.id } as Environment)
      hook.project.upsert.mockResolvedValue({ results: {}, project: { ...project } })

      await deleteEnvironment({ environmentId, userId: user.id, projectId: project.id, requestId })

      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(prisma.environment.delete).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
    })

    it('should update quota and trigger hook but hooks failed', async () => {
      const requestId = faker.string.uuid()
      const environmentId = faker.string.uuid()

      prisma.environment.delete.mockResolvedValue({ projectId: project.id } as Environment)
      hook.project.upsert.mockResolvedValue({ results: { failed: true }, project: { ...project } })

      const result = await deleteEnvironment({ environmentId, userId: user.id, projectId: project.id, requestId })

      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(prisma.environment.delete).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
      expect(result).toBeInstanceOf(ErrorResType)
    })
  })
})
