import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROJECT_PERMS, projectServiceContract } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import app from '../../app'
import * as utilsController from '../../utils/controller'
import { getProjectMockInfos, getUserMockInfos } from '../../utils/mocks'
import * as business from './business'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessGetServicesMock = vi.spyOn(business, 'getProjectServices')
const businessUpdateServicesMock = vi.spyOn(business, 'updateProjectServices')

describe('projectServiceRouter tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const projectId = faker.string.uuid()

  describe('getServices', () => {
    it('should return services for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessGetServicesMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(projectServiceContract.getServices.path.replace(':projectId', projectId))
        .query({ permissionTarget: 'user' })
        .end()

      expect(businessGetServicesMock).toHaveBeenCalledWith(projectId, 'user')
      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([])
    })

    it('should not return admin services for non admin', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessGetServicesMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(projectServiceContract.getServices.path.replace(':projectId', projectId))
        .query({ permissionTarget: 'admin' })
        .end()

      expect(businessGetServicesMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })

    it('should return services for admin', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessGetServicesMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(projectServiceContract.getServices.path.replace(':projectId', projectId))
        .end()

      expect(businessGetServicesMock).toHaveBeenCalledWith(projectId, 'user')
      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([])
    })

    it('should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(projectServiceContract.getServices.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(404)
    })
  })

  describe('updateProjectServices', () => {
    const updateData = { serviceA: { param1: 'value' } }

    it('should update services for project manager', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateServicesMock.mockResolvedValueOnce(null)

      const response = await app.inject()
        .post(projectServiceContract.updateProjectServices.path.replace(':projectId', projectId))
        .body(updateData)
        .end()

      expect(businessUpdateServicesMock).toHaveBeenCalledWith(projectId, updateData, ['user'])
      expect(response.statusCode).toEqual(204)
    })

    it('should update services for project admin', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE })
      const user = getUserMockInfos(true, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateServicesMock.mockResolvedValueOnce(null)

      const response = await app.inject()
        .post(projectServiceContract.updateProjectServices.path.replace(':projectId', projectId))
        .body(updateData)
        .end()

      expect(businessUpdateServicesMock).toHaveBeenCalledWith(projectId, updateData, ['user', 'admin'])
      expect(response.statusCode).toEqual(204)
    })

    it('should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(projectServiceContract.updateProjectServices.path.replace(':projectId', projectId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 if project is archived', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(projectServiceContract.updateProjectServices.path.replace(':projectId', projectId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })

    it('should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(projectServiceContract.updateProjectServices.path.replace(':projectId', projectId))
        .body(updateData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })
  })
})
