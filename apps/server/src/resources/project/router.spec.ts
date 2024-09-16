import type { ProjectV2 } from '@cpn-console/shared'
import { PROJECT_PERMS, projectContract } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import app from '../../app.js'
import * as utilsController from '../../utils/controller.js'
import { BadRequest400 } from '../../utils/errors.js'
import { getProjectMockInfos, getRandomRequestor, getUserMockInfos } from '../../utils/mocks.js'
import * as business from './business.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessListMock = vi.spyOn(business, 'listProjects')
const businessCreateMock = vi.spyOn(business, 'createProject')
const businessUpdateMock = vi.spyOn(business, 'updateProject')
const businessDeleteMock = vi.spyOn(business, 'archiveProject')
const businessSyncMock = vi.spyOn(business, 'replayHooks')
const businessGetSecretsMock = vi.spyOn(business, 'getProjectSecrets')
const businessGenerateDataMock = vi.spyOn(business, 'generateProjectsData')

describe('test projectContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })
  const projectOwner: ProjectV2['owner'] = {
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    createdAt: (new Date()).toISOString(),
    updatedAt: (new Date()).toISOString(),
    id: faker.string.uuid(),
  }
  const projectId = faker.string.uuid()
  const project: Omit<ProjectV2, 'id'> = {
    name: faker.string.alpha({ length: 10, casing: 'lower' }),
    description: faker.string.alpha({ length: 5 }),
    clusterIds: [],
    createdAt: (new Date()).toISOString(),
    updatedAt: (new Date()).toISOString(),
    locked: false,
    organizationId: faker.string.uuid(),
    status: 'created',
    everyonePerms: '0',
    members: [],
    owner: projectOwner,
    ownerId: projectOwner.id,
    roles: [],
  }
  describe('check unauthorized user on project behaviour', () => {
    // UPDATE
    it('on Update', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body(project)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(404)
      expect(response.json()).toEqual({ message: 'Not Found' })
    })

    it('on Update without enough perms', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.LIST_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body(project)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Forbidden' })
    })

    // REPLAY
    it('on replay', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(projectContract.replayHooksForProject.path.replace(':projectId', projectId))
        .end()

      expect(businessSyncMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(404)
      expect(response.json()).toEqual({ message: 'Not Found' })
    })

    // SECRETS
    it('on see secret', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(projectContract.getProjectSecrets.path.replace(':projectId', projectId))
        .end()

      expect(businessGetSecretsMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(404)
      expect(response.json()).toEqual({ message: 'Not Found' })
    })

    // ARCHIVE
    it('on archive', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(projectContract.archiveProject.path.replace(':projectId', projectId))
        .end()

      expect(businessDeleteMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(404)
      expect(response.json()).toEqual({ message: 'Not Found' })
    })
  })
  describe('check locked project behaviour', () => {
    // UPDATE
    it('on Update as manager', async () => {
      const projectPerms = getProjectMockInfos({ projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body(project)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
    it('on Update as admin and locked to false', async () => {
      const projectPerms = getProjectMockInfos({ projectLocked: true, projectPermissions: 0n })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce({ id: projectId, ...project })
      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body({ description: project.description, locked: false })
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })
    it('on Update as admin and locked unset', async () => {
      const projectPerms = getProjectMockInfos({ projectLocked: true, projectPermissions: 0n })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce({ id: projectId, ...project })
      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body({ description: project.description })
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })

    // REPLAY
    it('on replay as manager', async () => {
      const projectPerms = getProjectMockInfos({ projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(projectContract.replayHooksForProject.path.replace(':projectId', projectId))
        .end()

      expect(businessSyncMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })

    // ARCHIVE
    it('on archive as manager', async () => {
      const projectPerms = getProjectMockInfos({ projectLocked: true, projectPermissions: PROJECT_PERMS.MANAGE })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(projectContract.archiveProject.path.replace(':projectId', projectId))
        .end()

      expect(businessDeleteMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })
  })
  describe('check archived project behaviour', () => {
    // UPDATE
    it('on Update as manager', async () => {
      const projectPerms = getProjectMockInfos({ projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body(project)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
    it('on Update as admin', async () => {
      const projectPerms = getProjectMockInfos({ projectStatus: 'archived', projectPermissions: 0n })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce({ id: projectId, ...project })
      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body({ description: project.description })
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })

    // REPLAY
    it('on replay as manager', async () => {
      const projectPerms = getProjectMockInfos({ projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(projectContract.replayHooksForProject.path.replace(':projectId', projectId))
        .end()

      expect(businessSyncMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })

    it('on see secrets as manager and admin', async () => {
      const projectPerms = getProjectMockInfos({ projectStatus: 'archived', projectPermissions: PROJECT_PERMS.MANAGE })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(projectContract.getProjectSecrets.path.replace(':projectId', projectId))
        .end()

      expect(businessGetSecretsMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })

    // ARCHIVE
    it('on archive as manager', async () => {
      const projectPerms = getProjectMockInfos({ projectStatus: 'archived', projectPermissions: PROJECT_PERMS.MANAGE })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(projectContract.archiveProject.path.replace(':projectId', projectId))
        .end()

      expect(businessDeleteMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })
  })
  describe('listProjects', () => {
    it('should return list of projects', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)
      const projects = []
      businessListMock.mockResolvedValueOnce(projects)
      const response = await app.inject()
        .get(projectContract.listProjects.path)
        .end()

      expect(businessListMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(projects)
      expect(response.statusCode).toEqual(200)
    })
    it('should return 400 for non-admin with "all" filter', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)
      const response = await app.inject()
        .get(`${projectContract.listProjects.path}?filter=all`)
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })

  describe('createProject', () => {
    it('should create and return project for authorized user', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce({ id: projectId, ...project })
      const response = await app.inject()
        .post(projectContract.createProject.path)
        .body(project)
        .end()

      expect(businessCreateMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual({ id: projectId, ...project })
      expect(response.statusCode).toEqual(201)
    })

    it('should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .post(projectContract.createProject.path)
        .body(project)
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })

  describe('updateProject', () => {
    const projectUpdated: Partial<ProjectV2> = { description: faker.string.alpha({ length: 5 }) }

    it('should update and return project for authorized user', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce({ id: projectId, ...project, ...projectUpdated })
      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body(projectUpdated)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual({ id: projectId, ...project, ...projectUpdated })
      expect(response.statusCode).toEqual(200)
    })

    it('should not update ownerId if not permitted', async () => {
      const userDetails = getRandomRequestor()
      const projectPerms = getProjectMockInfos({ projectOwnerId: faker.string.uuid(), projectPermissions: PROJECT_PERMS.MANAGE })
      const projectUpdated = { ownerId: faker.string.uuid(), description: faker.lorem.words() }
      const user = getUserMockInfos(false, userDetails, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce({ id: projectId, ...project, ...projectUpdated })
      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body(projectUpdated)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledWith({ description: projectUpdated.description }, projectId, user.user, expect.any(String))
      expect(response.json()).toEqual({ id: projectId, ...project, ...projectUpdated })
      expect(response.statusCode).toEqual(200)
    })

    it('should update ownerId and return project', async () => {
      const requestor = getRandomRequestor()
      const projectPerms = getProjectMockInfos({ projectOwnerId: requestor.id, projectPermissions: PROJECT_PERMS.MANAGE })
      const projectUpdated = { ownerId: faker.string.uuid(), description: faker.lorem.words() }
      const user = getUserMockInfos(false, requestor, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce({ id: projectId, ...project, ...projectUpdated })
      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body(projectUpdated)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledWith(projectUpdated, projectId, user.user, expect.any(String))
      expect(response.json()).toEqual({ id: projectId, ...project, ...projectUpdated })
      expect(response.statusCode).toEqual(200)
    })

    it('should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body(project)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(400)
    })
  })

  describe('archiveProject', () => {
    it('should archive project for authorized user', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteMock.mockResolvedValueOnce(null)
      const response = await app.inject()
        .delete(projectContract.archiveProject.path.replace(':projectId', faker.string.uuid()))
        .end()

      expect(businessDeleteMock).toHaveBeenCalledTimes(1)
      expect(response.body).toBeFalsy()
      expect(response.statusCode).toEqual(204)
    })

    it('should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .delete(projectContract.archiveProject.path.replace(':projectId', faker.string.uuid()))
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('should return projects data for admin', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.LIST_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(projectContract.archiveProject.path.replace(':projectId', faker.string.uuid()))
        .end()

      expect(businessDeleteMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('getProjectSecrets', () => {
    it('should return project secrets for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.SEE_SECRETS })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const secrets = {}
      businessGetSecretsMock.mockResolvedValueOnce(secrets)
      const response = await app.inject()
        .get(projectContract.getProjectSecrets.path.replace(':projectId', projectId))
        .end()

      expect(businessGetSecretsMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(secrets)
      expect(response.statusCode).toEqual(200)
    })

    it('should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessGetSecretsMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .get(projectContract.getProjectSecrets.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('should return 403 for unauthorized access to secrets', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.LIST_REPOSITORIES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(projectContract.getProjectSecrets.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('replayHooksForProject', () => {
    it('should replay hooks for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessSyncMock.mockResolvedValueOnce(null)
      const response = await app.inject()
        .put(projectContract.replayHooksForProject.path.replace(':projectId', projectId))
        .end()

      expect(businessSyncMock).toHaveBeenCalledTimes(1)
      expect(response.body).toBeFalsy()
      expect(response.statusCode).toEqual(204)
    })

    it('should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessSyncMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .put(projectContract.replayHooksForProject.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('should return 403 for unauthorized access to replay hooks', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.LIST_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)
      const response = await app.inject()
        .put(projectContract.replayHooksForProject.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('getProjectsData', () => {
    it('should return projects data for admin', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      const data = ''
      businessGenerateDataMock.mockResolvedValueOnce(data)
      const response = await app.inject()
        .get(projectContract.getProjectsData.path)
        .end()

      expect(businessGenerateDataMock).toHaveBeenCalledTimes(1)
      expect(response.body).toEqual(data)
      expect(response.statusCode).toEqual(200)
    })

    it('should return 403 for non-admin user', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(projectContract.getProjectsData.path)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })
})
