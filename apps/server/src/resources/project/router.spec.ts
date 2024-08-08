import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PROJECT_PERMS, projectContract, ProjectV2 } from '@cpn-console/shared'
import app from '../../app.js'
import * as business from './business.js'
import * as utilsController from '../../utils/controller.js'
import { faker } from '@faker-js/faker'
import { getProjectMockInfos, getRandomRequestor, getUserMockInfos } from '../../utils/mocks.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessListMock = vi.spyOn(business, 'listProjects')
const businessCreateMock = vi.spyOn(business, 'createProject')
const businessUpdateMock = vi.spyOn(business, 'updateProject')
const businessDeleteMock = vi.spyOn(business, 'archiveProject')
const businessSyncMock = vi.spyOn(business, 'replayHooks')
const businessGetSecretsMock = vi.spyOn(business, 'getProjectSecrets')
const businessGenerateDataMock = vi.spyOn(business, 'generateProjectsData')

describe('Test projectContract', () => {
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
    it('On Update', async () => {
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

    it('On Update without enough perms', async () => {
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
    it('On replay', async () => {
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
    it('On replay', async () => {
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
    it('On archive', async () => {
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
    it('On Update as manager', async () => {
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
    it('On Update as admin and locked to false', async () => {
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
    it('On Update as admin and locked unset', async () => {
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
    it('On replay as manager', async () => {
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
    it('On archive as manager', async () => {
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
    it('On Update as manager', async () => {
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
    it('On Update as admin', async () => {
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
    it('On replay as manager', async () => {
      const projectPerms = getProjectMockInfos({ projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(projectContract.replayHooksForProject.path.replace(':projectId', projectId))
        .end()

      expect(businessSyncMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })

    it('On see secrets as manager and admin', async () => {
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
    it('On archive as manager', async () => {
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
    it('Should return list of projects', async () => {
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
    it('Should return 400 for non-admin with "all" filter', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)
      const response = await app.inject()
        .get(projectContract.listProjects.path + '?filter=all')
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })

  describe('createProject', () => {
    it('Should create and return project for authorized user', async () => {
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

    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .post(projectContract.createProject.path)
        .body(project)
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })

  describe('updateProject', () => {
    const projectUpdated: Partial<ProjectV2> = { description: faker.string.alpha({ length: 5 }) }

    it('Should update and return project for authorized user', async () => {
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

    it('Should not update ownerId if not permitted', async () => {
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

    it('Should update ownerId and return project', async () => {
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

    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .put(projectContract.updateProject.path.replace(':projectId', projectId))
        .body(project)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(400)
    })
  })

  describe('archiveProject', () => {
    it('Should archive project for authorized user', async () => {
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

    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .delete(projectContract.archiveProject.path.replace(':projectId', faker.string.uuid()))
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should return projects data for admin', async () => {
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
    it('Should return project secrets for authorized user', async () => {
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

    it('Should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessGetSecretsMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .get(projectContract.getProjectSecrets.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should return 403 for unauthorized access to secrets', async () => {
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
    it('Should replay hooks for authorized user', async () => {
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

    it('Should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessSyncMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .put(projectContract.replayHooksForProject.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should return 403 for unauthorized access to replay hooks', async () => {
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
    it('Should return projects data for admin', async () => {
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

    it('Should return 403 for non-admin user', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(projectContract.getProjectsData.path)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })
})