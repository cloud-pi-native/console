import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminRoleContract } from '@cpn-console/shared'
import app from '../../app'
import * as utilsController from '../../utils/controller'
import { BadRequest400 } from '../../utils/errors'
import { getUserMockInfos } from '../../utils/mocks'
import * as business from './business'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessListRolesMock = vi.spyOn(business, 'listRoles')
const businessCreateRoleMock = vi.spyOn(business, 'createRole')
const businessPatchRolesMock = vi.spyOn(business, 'patchRoles')
const businessCountRolesMembersMock = vi.spyOn(business, 'countRolesMembers')
const businessDeleteRoleMock = vi.spyOn(business, 'deleteRole')

describe('test adminRoleContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('listAdminRoles', () => {
    it('should return list of admin roles', async () => {
      const roles = [{ id: faker.string.uuid(), name: 'Role 1', oidcGroup: '', position: 0, permissions: '1' }]
      businessListRolesMock.mockResolvedValueOnce(roles)

      const response = await app.inject()
        .get(adminRoleContract.listAdminRoles.path)
        .end()

      expect(businessListRolesMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(roles)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('createAdminRole', () => {
    it('should create a role for authorized users', async () => {
      const user = getUserMockInfos(true)
      const newRole = { id: 'newRole', name: 'New Role' }
      const roleData = { name: 'New Role' }

      authUserMock.mockResolvedValueOnce(user)
      businessCreateRoleMock.mockResolvedValueOnce(newRole)

      const response = await app.inject()
        .post(adminRoleContract.createAdminRole.path)
        .body(roleData)
        .end()

      expect(businessCreateRoleMock).toHaveBeenCalledWith(roleData)
      expect(response.json()).toEqual(newRole)
      expect(response.statusCode).toEqual(201)
    })

    it('should return 403 for unauthorized users', async () => {
      const user = getUserMockInfos(false)

      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(adminRoleContract.createAdminRole.path)
        .body({ name: 'New Role' })
        .end()

      expect(businessCreateRoleMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('patchAdminRoles', () => {
    const updatedRoles = [{ id: faker.string.uuid(), name: 'Role 1', oidcGroup: '', position: 0, permissions: '1' }]
    const rolesData = [{ id: updatedRoles[0].id, name: 'Updated Role' }]
    it('should update roles for authorized users', async () => {
      const user = getUserMockInfos(true)

      authUserMock.mockResolvedValueOnce(user)
      businessPatchRolesMock.mockResolvedValueOnce(updatedRoles)

      const response = await app.inject()
        .patch(adminRoleContract.patchAdminRoles.path)
        .body(rolesData)
        .end()

      expect(businessPatchRolesMock).toHaveBeenCalledWith(rolesData)
      expect(response.json()).toEqual(updatedRoles)
      expect(response.statusCode).toEqual(200)
    })

    it('should return error if business logic fails', async () => {
      const user = getUserMockInfos(true)

      authUserMock.mockResolvedValueOnce(user)
      businessPatchRolesMock.mockResolvedValueOnce(new BadRequest400('une erreur'))

      const response = await app.inject()
        .patch(adminRoleContract.patchAdminRoles.path)
        .body(rolesData)
        .end()

      expect(businessPatchRolesMock).toHaveBeenCalledWith(rolesData)
      expect(response.statusCode).toEqual(400)
    })

    it('should return 403 for unauthorized users', async () => {
      const user = getUserMockInfos(false)

      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .patch(adminRoleContract.patchAdminRoles.path)
        .body(rolesData)
        .end()

      expect(businessPatchRolesMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('adminRoleMemberCounts', () => {
    it('should return counts of role members for admin', async () => {
      const user = getUserMockInfos(true)
      const counts = { role1: 5, role2: 3 }

      authUserMock.mockResolvedValueOnce(user)
      businessCountRolesMembersMock.mockResolvedValueOnce(counts)

      const response = await app.inject()
        .get(adminRoleContract.adminRoleMemberCounts.path)
        .end()

      expect(businessCountRolesMembersMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(counts)
      expect(response.statusCode).toEqual(200)
    })

    it('should return 403 if user is not admin', async () => {
      const user = getUserMockInfos(false)

      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(adminRoleContract.adminRoleMemberCounts.path)
        .end()

      expect(businessCountRolesMembersMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('deleteAdminRole', () => {
    const roleId = faker.string.uuid()
    it('should delete a role for authorized users', async () => {
      const user = getUserMockInfos(true)

      authUserMock.mockResolvedValueOnce(user)
      businessDeleteRoleMock.mockResolvedValueOnce(null)

      const response = await app.inject()
        .delete(adminRoleContract.deleteAdminRole.path.replace(':roleId', roleId))
        .end()

      expect(businessDeleteRoleMock).toHaveBeenCalledWith(roleId)
      expect(response.statusCode).toEqual(204)
    })

    it('should return 403 for unauthorized users', async () => {
      const user = getUserMockInfos(false)

      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(adminRoleContract.deleteAdminRole.path.replace(':roleId', roleId))
        .end()

      expect(businessDeleteRoleMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })
})
