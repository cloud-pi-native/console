import { faker } from '@faker-js/faker'
import { PROJECT_PERMS, projectRoleContract } from '@cpn-console/shared'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import app from '../../app.js'
import * as business from './business.js'
import * as utilsController from '../../utils/controller.js'
import { getProjectMockInfos, getUserMockInfos } from '../../utils/mocks.js'
import { BadRequest400 } from '../../utils/errors.js'

vi.mock('./business.js')
vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)

const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessCreateRoleMock = vi.spyOn(business, 'createRole')
const businessDeleteRoleMock = vi.spyOn(business, 'deleteRole')
const businessListRolesMock = vi.spyOn(business, 'listRoles')
const businessPatchRolesMock = vi.spyOn(business, 'patchRoles')
const businessCountRolesMembersMock = vi.spyOn(business, 'countRolesMembers')

describe('Tests projectRoleContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const projectId = faker.string.uuid()
  const roleId = faker.string.uuid()

  describe('listProjectRoles', () => {
    it('Should return roles for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.SEE_SECRETS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessListRolesMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(projectRoleContract.listProjectRoles.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([])
    })

    it('Should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(projectRoleContract.listProjectRoles.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(404)
    })
  })

  describe('createProjectRole', () => {
    it('Should create role for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ROLES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateRoleMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .post(projectRoleContract.createProjectRole.path.replace(':projectId', projectId))
        .body({ name: 'nouveau rôle' })
        .end()

      expect(response.json()).toEqual([])
      expect(response.statusCode).toEqual(201)
    })

    it('Should return 403 for locked project', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ROLES, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(projectRoleContract.createProjectRole.path.replace(':projectId', projectId))
        .body({ name: 'nouveau rôle' })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('Should return 403 if not permited', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.SEE_SECRETS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(projectRoleContract.createProjectRole.path.replace(':projectId', projectId))
        .body({ name: 'nouveau rôle' })
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('Should return 404 if non-member', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(projectRoleContract.createProjectRole.path.replace(':projectId', projectId))
        .body({ name: 'nouveau rôle' })
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('Should return 403 for archived project', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ROLES, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(projectRoleContract.createProjectRole.path.replace(':projectId', projectId))
        .body({ name: 'nouveau rôle' })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })
  })

  describe('patchProjectRoles', () => {
    it('Should patch roles for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ROLES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessPatchRolesMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .patch(projectRoleContract.patchProjectRoles.path.replace(':projectId', projectId))
        .body([{ id: roleId, name: 'nouveau rôle' }])
        .end()

      expect(response.json()).toEqual([])
      expect(response.statusCode).toEqual(200)
    })

    it('Should return 403 for locked project', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ROLES, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .patch(projectRoleContract.patchProjectRoles.path.replace(':projectId', projectId))
        .body([{ id: roleId, name: 'nouveau rôle' }])
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('Should return 403 if not permited', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.SEE_SECRETS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .patch(projectRoleContract.patchProjectRoles.path.replace(':projectId', projectId))
        .body([{ id: roleId, name: 'nouveau rôle' }])
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('Should return 404 if non-member', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .patch(projectRoleContract.patchProjectRoles.path.replace(':projectId', projectId))
        .body([{ id: roleId, name: 'nouveau rôle' }])
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('Should return 403 for archived project', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ROLES, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .patch(projectRoleContract.patchProjectRoles.path.replace(':projectId', projectId))
        .body([{ id: roleId, name: 'nouveau rôle' }])
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })

    it('Should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ROLES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessPatchRolesMock.mockResolvedValue(new BadRequest400('une erreur'))
      const response = await app.inject()
        .patch(projectRoleContract.patchProjectRoles.path.replace(':projectId', projectId))
        .body([{ id: roleId, name: 'nouveau rôle' }])
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })

  describe('projectRoleMemberCounts', () => {
    it('Should return member counts for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.SEE_SECRETS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCountRolesMembersMock.mockResolvedValueOnce({})

      const response = await app.inject()
        .get(projectRoleContract.projectRoleMemberCounts.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual({})
    })

    it('Should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(projectRoleContract.projectRoleMemberCounts.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(404)
    })
  })

  describe('deleteProjectRole', () => {
    it('Should delete role for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ROLES })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteRoleMock.mockResolvedValueOnce(null)
      const response = await app.inject()
        .delete(projectRoleContract.deleteProjectRole.path.replace(':projectId', projectId).replace(':roleId', roleId))
        .end()

      expect(response.json()).toEqual(null)
      expect(response.statusCode).toEqual(200)
    })

    it('Should return 403 for locked project', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ROLES, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateRoleMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .delete(projectRoleContract.deleteProjectRole.path.replace(':projectId', projectId).replace(':roleId', roleId))
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('Should return 403 if not permited', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.SEE_SECRETS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateRoleMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .delete(projectRoleContract.deleteProjectRole.path.replace(':projectId', projectId).replace(':roleId', roleId))
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('Should return 404 if non-member', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateRoleMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .delete(projectRoleContract.deleteProjectRole.path.replace(':projectId', projectId).replace(':roleId', roleId))
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('Should return 403 for archived project', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_ROLES, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateRoleMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .delete(projectRoleContract.deleteProjectRole.path.replace(':projectId', projectId).replace(':roleId', roleId))
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })
  })
})
