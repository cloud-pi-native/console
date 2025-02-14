import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROJECT_PERMS, environmentContract } from '@cpn-console/shared'
import app from '../../app.js'
import * as utilsController from '../../utils/controller.js'
import { atDates, getProjectMockInfos, getUserMockInfos } from '../../utils/mocks.js'
import { BadRequest400 } from '../../utils/errors.js'
import * as business from './business.js'

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
    it('should return environments for authorized user', async () => {
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

    it('should return empty for non member of projectId query ', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(environmentContract.listEnvironments.path)
        .query({ projectId })
        .end()

      expect(businessGetProjectEnvironmentsMock).toHaveBeenCalledTimes(0)
      expect(response.json()).toEqual([])
    })
  })

  describe('createEnvironment', () => {
    it('should create environment for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCheckEnvironmentInputMock.mockResolvedValueOnce(null)
      businessCreateEnvironmentMock.mockResolvedValueOnce({ id: environmentId, ...environmentData, ...atDates })

      const response = await app.inject()
        .post(environmentContract.createEnvironment.path)
        .body(environmentData)
        .end()

      expect(response.json()).toMatchObject({ id: environmentId, ...environmentData })
      expect(response.statusCode).toEqual(201)
    })

    it('should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(environmentContract.createEnvironment.path)
        .body(environmentData)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 if project is archived', async () => {
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

    it('should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(environmentContract.createEnvironment.path)
        .body(environmentData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('should return 403 if not permited', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(environmentContract.createEnvironment.path)
        .body(environmentData)
        .end()

      expect(response.statusCode).toEqual(403)
    })
    it('should pass business error', async () => {
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
    it('should pass invalid reason error', async () => {
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
    it('should create environment for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCheckEnvironmentInputMock.mockResolvedValueOnce(null)
      businessUpdateEnvironmentMock.mockResolvedValueOnce({ id: environmentId, ...environmentData, ...atDates })

      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.json()).toMatchObject({ id: environmentId, ...environmentData })
      expect(response.statusCode).toEqual(200)
    })

    it('should return 403 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.LIST_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 if project is archived', async () => {
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

    it('should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('should return 404 if not permited', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(environmentContract.updateEnvironment.path.replace(':environmentId', environmentId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(404)
    })
    it('should pass business error', async () => {
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
    it('should pass invalid reason error', async () => {
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
    it('should delete environment for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteEnvironmentMock.mockResolvedValueOnce(null)

      const response = await app.inject()
        .delete(environmentContract.deleteEnvironment.path.replace(':environmentId', environmentId))
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(environmentContract.deleteEnvironment.path.replace(':environmentId', environmentId))
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(environmentContract.deleteEnvironment.path.replace(':environmentId', environmentId))
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(environmentContract.deleteEnvironment.path.replace(':environmentId', environmentId))
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('should return 403 if project is archived', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(environmentContract.deleteEnvironment.path.replace(':environmentId', environmentId))
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })

    it('should pass business error', async () => {
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
