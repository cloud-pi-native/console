import type { UserContext } from '../auth.service'
import { AdminAuthorized } from '@cpn-console/shared'
import { ForbiddenException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeAdminPolicy, makeUserContext } from './admin-testing.utils'
import { AdminService } from './admin.service'

describe('adminService', () => {
  let service: AdminService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AdminService],
    }).compile()

    service = module.get(AdminService)
  })

  describe('validateAdminPermissions', () => {
    it('does not throw when no admin permissions are required', () => {
      expect(() => service.validateAdminPermissions(makeAdminPolicy({}), 0n)).not.toThrow()
    })

    it('does not throw when the user has the required admin permission', () => {
      const adminPerms = AdminAuthorized.ListSystem(32768n) ? 32768n : 0n
      expect(() => service.validateAdminPermissions(makeAdminPolicy({ adminPermissions: ['ListSystem'] }), adminPerms)).not.toThrow()
    })

    it('throws ForbiddenException when the user lacks the required admin permission', () => {
      expect(() => service.validateAdminPermissions(makeAdminPolicy({ adminPermissions: ['ManageSystem'] }), 0n)).toThrow(ForbiddenException)
    })

    it('validates multiple required admin permissions', () => {
      expect(() => service.validateAdminPermissions(makeAdminPolicy({ adminPermissions: ['ManageSystem', 'ListSystem'] }), 0n)).toThrow(ForbiddenException)
    })

    it('treats undefined adminPermissions as 0n', () => {
      expect(() => service.validateAdminPermissions(makeAdminPolicy({ adminPermissions: ['Manage'] }), undefined)).toThrow(ForbiddenException)
    })
  })

  describe('validateUserType', () => {
    it('does not throw when no user types are required', () => {
      expect(() => service.validateUserType(makeAdminPolicy({}), 'human')).not.toThrow()
    })

    it('does not throw when the user type is in the allowed list', () => {
      expect(() => service.validateUserType(makeAdminPolicy({ userTypes: ['human'] }), 'human')).not.toThrow()
    })

    it('throws ForbiddenException when the user type is not in the allowed list', () => {
      expect(() => service.validateUserType(makeAdminPolicy({ userTypes: ['human'] }), 'service')).toThrow(ForbiddenException)
    })

    it('throws ForbiddenException when userType is undefined', () => {
      expect(() => service.validateUserType(makeAdminPolicy({ userTypes: ['human'] }), undefined)).toThrow(ForbiddenException)
    })
  })

  describe('validate', () => {
    it('delegates to validateAdminPermissions and validateUserType', () => {
      const spyPerms = vi.spyOn(service, 'validateAdminPermissions')
      const spyType = vi.spyOn(service, 'validateUserType')
      const user: UserContext = makeUserContext({ adminPermissions: 1n, userType: 'human' })

      service.validate(makeAdminPolicy({}), user)

      expect(spyPerms).toHaveBeenCalled()
      expect(spyType).toHaveBeenCalled()
    })
  })
})
