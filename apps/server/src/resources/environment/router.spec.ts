import { faker } from '@faker-js/faker'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { environmentContract, PROJECT_PERMS } from '@cpn-console/shared'
import app from '../../app.js'
import * as business from './business.js'
import * as utilsController from '../../utils/controller.js'
import { getProjectMockInfos, getUserMockInfos } from '../../utils/mocks.js'
import { BadRequest400 } from '../../utils/errors.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessGetProjectEnvironmentsMock = vi.spyOn(business, 'getProjectEnvironments')
const businessCreateEnvironmentMock = vi.spyOn(business, 'createEnvironment')
const businessUpdateEnvironmentMock = vi.spyOn(business, 'updateEnvironment')
const businessDeleteEnvironmentMock = vi.spyOn(business, 'deleteEnvironment')
const businessCheckEnvironmentInputMock = vi.spyOn(business, 'checkEnvironmentInput')

describe('environmentRouter tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const projectId = faker.string.uuid()
  const environmentId = faker.string.uuid()
  const environmentData = { projectId, name: 'envname', clusterId: faker.string.uuid(), quotaId: faker.string.uuid(), stageId: faker.string.uuid() }

  describe('listEnvironments', () => {
    it('Should return environments for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.LIST_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessGetProjectEnvironmentsMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(environmentContract.listEnvironments.path)
        .query({ projectId })
        .end()

      expect(businessGetProjectEnvironmentsMock).toHaveBeenCalledWith(projectId)
      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([])
    })

    it('Should return 404 for non member of projectId query ', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(environmentContract.listEnvironments.path)
        .query({ projectId })
        .end()

      expect(response.statusCode).toEqual(404)
    })
  })

  describe('createEnvironment', () => {
    it('Should create environment for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCheckEnvironmentInputMock.mockResolvedValueOnce(null)
      businessCreateEnvironmentMock.mockResolvedValueOnce({ id: environmentId, ...environmentData })

      const response = await app.inject()
        .post(environmentContract.createEnvironment.path)
        .body(environmentData)
        .end()

      expect(response.json()).toEqual({ id: environmentId, ...environmentData })
      expect(response.statusCode).toEqual(201)
    })

    it('Should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(environmentContract.createEnvironment.path)
        .body(environmentData)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('Should return 403 if project is archived', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(environmentContract.createEnvironment.path)
        .body(environmentData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })

    it('Should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(environmentContract.createEnvironment.path)
        .body(environmentData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouilé' })
    })

    it('Should return 403 if not permited', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(environmentContract.createEnvironment.path)
        .body(environmentData)
        .end()

      expect(response.statusCode).toEqual(403)
    })
    it('Should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateEnvironmentMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .post(environmentContract.createEnvironment.path)
        .body(environmentData)
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should pass invalid reason error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCheckEnvironmentInputMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .post(environmentContract.createEnvironment.path)
        .body(environmentData)
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })

  describe('updateEnvironment', () => {
    const updateData = { quotaId: faker.string.uuid() }
    it('Should create environment for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCheckEnvironmentInputMock.mockResolvedValueOnce(null)
      businessUpdateEnvironmentMock.mockResolvedValueOnce({ id: environmentId, ...environmentData })

      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.json()).toEqual({ id: environmentId, ...environmentData })
      expect(response.statusCode).toEqual(200)
    })

    it('Should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.LIST_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(403)
    })
    it('Should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('Should return 403 if project is archived', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })

    it('Should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouilé' })
    })

    it('Should return 404 if not permited', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(404)
    })
    it('Should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateEnvironmentMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should pass invalid reason error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCheckEnvironmentInputMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })

  describe('deleteEnvironment', () => {
    it('Should delete environment for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteEnvironmentMock.mockResolvedValueOnce(null)

      const response = await app.inject()
        .delete(environmentContract.deleteEnvironment.path.replace(':environmentId', environmentId))
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(environmentContract.deleteEnvironment.path.replace(':environmentId', environmentId))
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('Should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(environmentContract.deleteEnvironment.path.replace(':environmentId', environmentId))
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('Should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(environmentContract.deleteEnvironment.path.replace(':environmentId', environmentId))
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouilé' })
    })

    it('Should return 403 if project is archived', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(environmentContract.deleteEnvironment.path.replace(':environmentId', environmentId))
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })

    it('Should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteEnvironmentMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .delete(environmentContract.deleteEnvironment.path.replace(':environmentId', environmentId))
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })
})
