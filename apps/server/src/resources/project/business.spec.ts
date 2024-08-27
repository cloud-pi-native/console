import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cluster, Project, ProjectMembers, ProjectRole, User } from '@prisma/client'
import prisma from '../../__mocks__/prisma.js'
import { hook } from '../../__mocks__/utils/hook-wrapper.ts'
import { dbToObj } from '../project-service/business.ts'
import * as userBusiness from '../user/business.js'
import {
  BadRequest400,
  Unprocessable422,
} from '../../utils/errors.js'
import { archiveProject, createProject, generateProjectsData, getProjectSecrets, listProjects, replayHooks, updateProject } from './business.ts'

vi.mock('../../utils/hook-wrapper.ts', async () => ({
  hook,
}))

const logUserMock = vi.spyOn(userBusiness, 'logUser')

const projectId = faker.string.uuid()

const user: User = {
  id: faker.string.uuid(),
  createdAt: new Date(),
  updatedAt: new Date(),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  adminRoleIds: [],
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
  organizationId: faker.string.uuid(),
  status: 'created',
  ownerId: faker.string.uuid(),
  clusters: [],
  roles: [],
  members: [],
}
const reqId = faker.string.uuid()
describe('test project business utils', () => {
  it('should transform arrow ', async () => {
    const result = dbToObj([{ key: 'test', pluginName: 'test', value: 'test' }])
    expect(result).toEqual({ test: { test: 'test' } })
  })
})

describe('test project business logic', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })
  describe('listProjects', () => {
    it('should return stringified perms', async () => {
      prisma.project.findMany.mockResolvedValue([{ everyonePerms: 5n, clusters: [], roles: [{ permissions: 28n }] }])
      const response = await listProjects({}, user.id)
      expect(response[0].everyonePerms).toBe('5')
      expect(response[0].roles[0].permissions).toBe('28')
    })
  })
  describe('getProjectSecrets', () => {
    const getResultsHook = {
      failed: false,
      args: {},
      results: {
        registry: {
          secrets: {
            token: 'myToken',
          },
          status: {
            failed: false,
          },
        },
      },
    }
    it('should return transform secret', async () => {
      hook.project.getSecrets.mockResolvedValue(getResultsHook)

      prisma.project.findUniqueOrThrow.mockResolvedValue({ id: projectId })
      const response = await getProjectSecrets(projectId)

      // according to src/utils/mocks.ts
      expect(JSON.stringify(response)).toContain('myToken')
    })

    it('should return projects secrets', async () => {
      hook.project.getSecrets.mockResolvedValue(getResultsHook)
      prisma.project.findUniqueOrThrow.mockResolvedValue({ id: projectId })
      prisma.project.findMany.mockResolvedValue({ id: projectId })
      const response = await getProjectSecrets(projectId)
      // according to src/utils/mocks.ts
      expect(JSON.stringify(response)).toContain('myToken')
    })

    it('should return hook error', async () => {
      hook.project.getSecrets.mockResolvedValue({ failed: true })
      prisma.project.findUniqueOrThrow.mockResolvedValue({ id: projectId })
      prisma.project.findMany.mockResolvedValue({ id: projectId })
      const response = await getProjectSecrets(projectId)
      // according to src/utils/mocks.ts
      expect(response).instanceOf(Unprocessable422)
    })
  })

  describe('createProject', () => {
    it('should create project', async () => {
      logUserMock.mockResolvedValue({ user })

      prisma.organization.findUnique.mockResolvedValue({ id: project.organizationId, active: true })
      prisma.project.create.mockResolvedValue({ ...project, status: 'initializing' })
      prisma.project.findFirst.mockResolvedValue(undefined)
      hook.project.upsert.mockResolvedValue({ results: {}, project: { ...project } })

      await createProject(project, user, reqId)

      expect(prisma.project.create).toHaveBeenCalledTimes(1)
      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
    })

    it('should not create project, cause missing organization', async () => {
      logUserMock.mockResolvedValue({ user })

      prisma.organization.findUnique.mockResolvedValue(undefined)

      await createProject(project, user, reqId)

      expect(prisma.project.create).toHaveBeenCalledTimes(0)
      expect(prisma.log.create).toHaveBeenCalledTimes(0)
    })

    it('should not create project, cause inactive organization', async () => {
      logUserMock.mockResolvedValue({ user })

      prisma.organization.findUnique.mockResolvedValue({ id: project.organizationId, active: false })

      await createProject(project, user, reqId)

      expect(prisma.project.create).toHaveBeenCalledTimes(0)
      expect(prisma.log.create).toHaveBeenCalledTimes(0)
    })

    it('should not create project, cause confilct', async () => {
      logUserMock.mockResolvedValue({ user })

      prisma.organization.findUnique.mockResolvedValue({ id: project.organizationId })
      prisma.project.create.mockResolvedValue({ ...project, status: 'initializing' })
      prisma.project.findFirst.mockResolvedValue({ id: faker.string.uuid(), name: project.name, organizationId: project.organizationId })

      await createProject(project, user, reqId)

      expect(prisma.project.create).toHaveBeenCalledTimes(0)
      expect(prisma.log.create).toHaveBeenCalledTimes(0)
    })

    it('should return plugins failed', async () => {
      logUserMock.mockResolvedValue({ user })

      prisma.organization.findUnique.mockResolvedValue({ id: project.organizationId, active: true })
      prisma.project.create.mockResolvedValue({ ...project, status: 'initializing' })
      prisma.project.findFirst.mockResolvedValue(undefined)
      hook.project.upsert.mockResolvedValue({ results: { failed: true }, project: { ...project } })

      const response = await createProject(project, user, reqId)

      expect(prisma.project.create).toHaveBeenCalledTimes(1)
      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
      expect(response).instanceOf(Unprocessable422)
    })
  })
  describe('updateProject', () => {
    const updatedProjet = {
      description: faker.lorem.lines(2),
      everyonePerms: '5',
    }
    const reqId = faker.string.uuid()
    const members: ProjectMembers[] = [{ userId: faker.string.uuid(), projectId: project.id, roleIds: [] }]
    it('should update project', async () => {
      prisma.project.findUniqueOrThrow.mockResolvedValue({ id: projectId, members })
      prisma.project.update.mockResolvedValue(project)
      hook.project.upsert.mockResolvedValue({ results: {}, project: { ...project } })

      await updateProject({ ...updatedProjet, ownerId: members[0].userId }, project.id, user, reqId)

      expect(prisma.project.update).toHaveBeenCalledTimes(2)
      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
    })

    it('should update nothing', async () => {
      prisma.project.findUniqueOrThrow.mockResolvedValue({ id: projectId, members })
      prisma.project.update.mockResolvedValue(project)
      hook.project.upsert.mockResolvedValue({ results: {}, project: { ...project } })

      await updateProject({ }, project.id, user, reqId)

      expect(prisma.project.update).toHaveBeenCalledTimes(0)
      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
    })

    it('should not update project, cause missing member', async () => {
      hook.project.upsert.mockResolvedValue({ results: {}, project: { ...project } })
      logUserMock.mockResolvedValue({ user })

      prisma.project.findUniqueOrThrow.mockResolvedValue({ id: projectId, members: [] })

      const response = await updateProject({ ownerId: members[0].userId }, project.id, user, reqId)

      expect(prisma.project.findUniqueOrThrow).toHaveBeenCalledTimes(1)
      expect(response).instanceOf(BadRequest400)
      expect(hook.project.upsert).toHaveBeenCalledTimes(0)
      expect(prisma.log.update).toHaveBeenCalledTimes(0)
    })

    it('should return plugins failed', async () => {
      logUserMock.mockResolvedValue({ user })

      prisma.organization.findUnique.mockResolvedValue({ id: project.organizationId })
      hook.project.upsert.mockResolvedValue({ results: { failed: true }, project: { ...project } })

      const response = await updateProject(updatedProjet, project.id, user, reqId)

      expect(prisma.project.update).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
      expect(response).instanceOf(Unprocessable422)
    })
  })
  describe('replayHooks', () => {
    const reqId = faker.string.uuid()

    it('should replay hooks', async () => {
      hook.project.upsert.mockResolvedValue({ results: { failed: false } })

      await replayHooks(project.id, user, reqId)

      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
    })

    it('should update nothing and return error', async () => {
      hook.project.upsert.mockResolvedValue({ results: { failed: true } })

      const response = await replayHooks(project.id, user, reqId)

      expect(prisma.log.create).toHaveBeenCalledTimes(1)
      expect(hook.project.upsert).toHaveBeenCalledTimes(1)
      expect(response).instanceOf(Unprocessable422)
    })
  })

  describe('archiveProject', () => {
    it('should archive project', async () => {
      hook.project.upsert.mockResolvedValue({ results: { failed: false } })
      hook.project.delete.mockResolvedValue({ results: { failed: false } })
      const response = await archiveProject(project.id, user, reqId)
      expect(response).toBeNull()
      expect(prisma.project.update).toHaveBeenLastCalledWith({
        where: { id: project.id },
        data: {
          clusters: { set: [] },
        },
      })
    })

    it('should return first hook fail', async () => {
      hook.project.upsert.mockResolvedValue({ results: { failed: true } })
      hook.project.delete.mockResolvedValue({ results: { failed: false } })
      const response = await archiveProject(project.id, user, reqId)
      expect(response).instanceOf(Unprocessable422)
    })

    it('should return second hook fail', async () => {
      hook.project.upsert.mockResolvedValue({ results: { failed: false } })
      hook.project.delete.mockResolvedValue({ results: { failed: true } })
      const response = await archiveProject(project.id, user, reqId)
      expect(response).instanceOf(Unprocessable422)
    })
  })

  describe('generateProjectsData', () => {
    it('shoud return string, very bad test ...', async () => {
      prisma.project.findMany.mockResolvedValue([{ name: 'test' }])
      const response = await generateProjectsData()
      expect(response).toBeTypeOf('string')
    })
  })
})
