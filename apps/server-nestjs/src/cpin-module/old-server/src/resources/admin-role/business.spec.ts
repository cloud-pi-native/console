import { describe, expect, it } from 'vitest'
import type { AdminRole, User } from '@prisma/client'
import { faker } from '@faker-js/faker'
import prisma from '../../__mocks__/prisma'
import { BadRequest400 } from '../../utils/errors'
import { countRolesMembers, createRole, deleteRole, listRoles, patchRoles } from './business'

describe('test admin-role business', () => {
  describe('listRoles', () => {
    it('should stringify bigint', async () => {
      const partialRole: Partial<AdminRole> = {
        permissions: 4n,
      }

      prisma.adminRole.findMany.mockResolvedValueOnce([partialRole])
      const response = await listRoles()
      expect(response).toEqual([{ permissions: '4' }])
    })
  })

  describe('createRole', () => {
    it('should create role with incremented position when position 0 is the highest', async () => {
      const dbRole: Partial<AdminRole> = {
        permissions: 4n,
        position: 0,
      }

      prisma.adminRole.findFirst.mockResolvedValueOnce(dbRole)
      prisma.adminRole.findMany.mockResolvedValueOnce([dbRole])
      prisma.adminRole.create.mockResolvedValue(null)
      await createRole({ name: 'test' })

      expect(prisma.adminRole.create).toHaveBeenCalledWith({ data: { name: 'test', permissions: 0n, position: 1 } })
    })

    it('should create role with incremented position with bigger position', async () => {
      const dbRole: Partial<AdminRole> = {
        permissions: 4n,
        position: 50,
      }

      prisma.adminRole.findFirst.mockResolvedValueOnce(dbRole)
      prisma.adminRole.findMany.mockResolvedValueOnce([dbRole])
      prisma.adminRole.create.mockResolvedValue(null)
      await createRole({ name: 'test' })

      expect(prisma.adminRole.create).toHaveBeenCalledWith({ data: { name: 'test', permissions: 0n, position: 51 } })
    })

    it('should create role with incremented position with no role in db', async () => {
      const dbRole: Partial<AdminRole> = {
        permissions: 4n,
        position: 50,
      }

      prisma.adminRole.findFirst.mockResolvedValueOnce(undefined)
      prisma.adminRole.findMany.mockResolvedValueOnce([dbRole])
      prisma.adminRole.create.mockResolvedValue(null)
      await createRole({ name: 'test' })

      expect(prisma.adminRole.create).toHaveBeenCalledWith({ data: { name: 'test', permissions: 0n, position: 0 } })
    })
  })
  describe('deleteRole', () => {
    const roleId = faker.string.uuid()
    it('should delete role and remove id from concerned users', async () => {
      const users = [{
        adminRoleIds: [roleId],
        id: faker.string.uuid(),
      }, {
        adminRoleIds: [roleId, faker.string.uuid()],
        id: faker.string.uuid(),
      }] as const satisfies Partial<User>[]

      prisma.user.findMany.mockResolvedValueOnce(users)
      prisma.adminRole.findMany.mockResolvedValueOnce([])
      prisma.adminRole.create.mockResolvedValue(null)
      await deleteRole(roleId)

      expect(prisma.user.update).toHaveBeenNthCalledWith(1, { where: { id: users[0].id }, data: { adminRoleIds: [] } })
      expect(prisma.user.update).toHaveBeenNthCalledWith(2, { where: { id: users[1].id }, data: { adminRoleIds: [users[1].adminRoleIds[1]] } })
      expect(prisma.adminRole.delete).toHaveBeenCalledWith({ where: { id: roleId } })
    })
  })
  describe('countRolesMembers', () => {
    it('should return aggregated role member counts', async () => {
      const partialRoles = [{
        id: faker.string.uuid(),
      }, {
        id: faker.string.uuid(),
      }] as const satisfies Partial<AdminRole>[]

      const users = [{
        adminRoleIds: [partialRoles[0].id, partialRoles[1].id],
      }, {
        adminRoleIds: [partialRoles[1].id],
      }] as const satisfies Partial<User>[]
      prisma.adminRole.findMany.mockResolvedValue(partialRoles)
      prisma.user.findMany.mockResolvedValue(users)

      const response = await countRolesMembers()

      expect(response).toEqual({ [partialRoles[0].id]: 1, [partialRoles[1].id]: 2 })
    })
  })
  describe('patchRoles', () => {
    const dbRoles: AdminRole[] = [{
      id: faker.string.uuid(),
      name: faker.company.name(),
      oidcGroup: '',
      permissions: faker.number.bigInt({ min: 0n, max: 50000n }),
      position: 0,
    }, {
      id: faker.string.uuid(),
      name: faker.company.name(),
      oidcGroup: '',
      permissions: faker.number.bigInt({ min: 0n, max: 50000n }),
      position: 1,
    }]

    it('should do nothing', async () => {
      prisma.adminRole.findMany.mockResolvedValue([])
      await patchRoles([])
      expect(prisma.adminRole.update).toHaveBeenCalledTimes(0)
    })

    it('should return 400 if incoherent positions', async () => {
      const updateRoles: Pick<AdminRole, 'id' | 'position'> = [
        { id: dbRoles[0].id, position: 1 },
        { id: dbRoles[1].id, position: 1 },
      ]
      prisma.adminRole.findMany.mockResolvedValue(dbRoles)

      const response = await patchRoles(updateRoles)

      expect(response).instanceOf(BadRequest400)
      expect(prisma.adminRole.update).toHaveBeenCalledTimes(0)
    })
    it('should return 400 if incoherent positions (missing roles)', async () => {
      const updateRoles: Pick<AdminRole, 'id' | 'position'> = [
        { id: dbRoles[1].id, position: 1 },
      ]
      prisma.adminRole.findMany.mockResolvedValue(dbRoles)

      const response = await patchRoles(updateRoles)

      expect(response).instanceOf(BadRequest400)
      expect(prisma.adminRole.update).toHaveBeenCalledTimes(0)
    })
    it('should update positions', async () => {
      const updateRoles: Pick<AdminRole, 'id' | 'position'> = [
        { id: dbRoles[0].id, position: 1 },
        { id: dbRoles[1].id, position: 0 },
      ]
      prisma.adminRole.findMany.mockResolvedValue(dbRoles)

      await patchRoles(updateRoles)

      expect(prisma.adminRole.update).toHaveBeenCalledTimes(2)
    })
    it('should update permissions', async () => {
      const updateRoles: Pick<AdminRole, 'id' | 'position'> = [
        { id: dbRoles[1].id, permissions: '0' },
      ]
      prisma.adminRole.findMany.mockResolvedValue(dbRoles)

      await patchRoles(updateRoles)

      expect(prisma.adminRole.update).toHaveBeenCalledTimes(1)
      expect(prisma.adminRole.update).toHaveBeenCalledWith({
        data: {
          name: dbRoles[1].name,
          oidcGroup: dbRoles[1].oidcGroup,
          permissions: 0n,
          position: 1,
        },
        where: {
          id: dbRoles[1].id,
        },
      })
    })
  })
})
