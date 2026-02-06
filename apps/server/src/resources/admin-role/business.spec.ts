import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import type { AdminRole, User } from '@prisma/client'
import prisma from '../../__mocks__/prisma.js'
import { BadRequest400, Forbidden403 } from '../../utils/errors.ts'
import { countRolesMembers, createRole, deleteRole, listRoles, patchRoles } from './business.ts'

describe('test admin-role business', () => {
  describe('listRoles', () => {
    it('should stringify bigint', async () => {
      const dbRole: AdminRole = {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        permissions: 4n,
        position: 0,
        oidcGroup: '',
        type: 'custom',
      }

      prisma.adminRole.findMany.mockResolvedValueOnce([dbRole])
      const response = await listRoles()
      expect(response).toContainEqual(expect.objectContaining({ permissions: '4', type: 'custom' }))
    })
  })

  describe('createRole', () => {
    it('should create role with incremented position when position 0 is the highest', async () => {
      const dbRole: AdminRole = {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        permissions: 4n,
        position: 0,
        oidcGroup: '',
        type: 'custom',
      }

      prisma.adminRole.findFirst.mockResolvedValueOnce(dbRole)
      prisma.adminRole.findMany.mockResolvedValueOnce([dbRole])
      prisma.adminRole.create.mockResolvedValue(dbRole)
      await createRole({ name: 'test' })

      expect(prisma.adminRole.create).toHaveBeenCalledWith({ data: { name: 'test', permissions: 0n, position: 1 } })
    })

    it('should create role with incremented position with bigger position', async () => {
      const dbRole: AdminRole = {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        permissions: 4n,
        position: 50,
        oidcGroup: '',
        type: 'custom',
      }

      prisma.adminRole.findFirst.mockResolvedValueOnce(dbRole)
      prisma.adminRole.findMany.mockResolvedValueOnce([dbRole])
      prisma.adminRole.create.mockResolvedValue(dbRole)
      await createRole({ name: 'test' })

      expect(prisma.adminRole.create).toHaveBeenCalledWith({ data: { name: 'test', permissions: 0n, position: 51 } })
    })

    it('should create role with incremented position with no role in db', async () => {
      const dbRole: AdminRole = {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        permissions: 4n,
        position: 50,
        oidcGroup: '',
        type: 'custom',
      }

      prisma.adminRole.findFirst.mockResolvedValueOnce(null)
      prisma.adminRole.findMany.mockResolvedValueOnce([dbRole])
      prisma.adminRole.create.mockResolvedValue(dbRole)
      await createRole({ name: 'test' })

      expect(prisma.adminRole.create).toHaveBeenCalledWith({ data: { name: 'test', permissions: 0n, position: 0 } })
    })
  })
  describe('deleteRole', () => {
    const roleId = faker.string.uuid()
    it('should delete role and remove id from concerned users', async () => {
      const users = [{
        id: faker.string.uuid(),
        type: 'human',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        adminRoleIds: [roleId],
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        lastLogin: faker.date.past(),
      }, {
        id: faker.string.uuid(),
        type: 'human',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        adminRoleIds: [roleId, faker.string.uuid()],
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        lastLogin: faker.date.past(),
      }] as const satisfies User[]

      const dbRole: AdminRole = {
        name: 'Admin',
        id: roleId,
        permissions: 4n,
        position: 50,
        oidcGroup: '',
        type: 'custom',
      }

      prisma.user.findMany.mockResolvedValue(users)
      prisma.adminRole.findMany.mockResolvedValueOnce([])
      prisma.adminRole.findUnique.mockResolvedValueOnce(dbRole)
      prisma.adminRole.create.mockResolvedValue(dbRole)
      await deleteRole(roleId)

      expect(prisma.user.update).toHaveBeenNthCalledWith(1, { where: { id: users[0].id }, data: { adminRoleIds: [] } })
      expect(prisma.user.update).toHaveBeenNthCalledWith(2, { where: { id: users[1].id }, data: { adminRoleIds: [users[1].adminRoleIds[1]] } })
      expect(prisma.adminRole.delete).toHaveBeenCalledWith({ where: { id: roleId } })
    })

    it('should return 403 if trying to delete system role', async () => {
      const systemRole = {
        id: roleId,
        type: 'system',
      }
      prisma.adminRole.findUnique.mockResolvedValue(systemRole as any)
      prisma.user.findMany.mockResolvedValue([])

      const response = await deleteRole(roleId)
      expect(response).toBeInstanceOf(Forbidden403)
      expect(prisma.adminRole.delete).not.toHaveBeenCalled()
    })
  })

  describe('countRolesMembers', () => {
    it('should return aggregated role member counts', async () => {
      const roles = [{
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        oidcGroup: '',
        permissions: faker.number.bigInt({ min: 0n, max: 50000n }),
        position: 0,
        type: 'custom',
      }, {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        oidcGroup: '',
        permissions: faker.number.bigInt({ min: 0n, max: 50000n }),
        position: 1,
        type: 'custom',
      }] as const satisfies AdminRole[]

      const users = [{
        id: faker.string.uuid(),
        type: 'human',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        adminRoleIds: [roles[0].id, roles[1].id],
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        lastLogin: faker.date.past(),
      }, {
        id: faker.string.uuid(),
        type: 'human',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        adminRoleIds: [roles[1].id],
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        lastLogin: faker.date.past(),
      }] as const satisfies User[]
      prisma.adminRole.findMany.mockResolvedValue(roles)
      prisma.user.findMany.mockResolvedValue(users)

      const response = await countRolesMembers()

      expect(response).toEqual({ [roles[0].id]: 1, [roles[1].id]: 2 })
    })
  })
  describe('patchRoles', () => {
    const dbRoles: AdminRole[] = [{
      id: faker.string.uuid(),
      name: faker.string.alphanumeric(),
      oidcGroup: '',
      permissions: faker.number.bigInt({ min: 0n, max: 50000n }),
      position: 0,
      type: 'custom',
    }, {
      id: faker.string.uuid(),
      name: faker.string.alphanumeric(),
      oidcGroup: '',
      permissions: faker.number.bigInt({ min: 0n, max: 50000n }),
      position: 1,
      type: 'custom',
    }]

    it('should throw Forbidden403 when renaming a system role', async () => {
      const systemRole: AdminRole = {
        id: faker.string.uuid(),
        name: 'Admin',
        permissions: 10n,
        position: 0,
        oidcGroup: 'admin-group',
        type: 'system',
      }
      prisma.adminRole.findMany.mockResolvedValue([systemRole])

      const updateRoles = [{
        id: systemRole.id,
        name: 'New Admin Name',
      }]

      const result = await patchRoles(updateRoles)

      await expect(result).toBeInstanceOf(Forbidden403)
      expect(prisma.adminRole.update).toHaveBeenCalledTimes(0)
    })

    it('should do nothing', async () => {
      prisma.adminRole.findMany.mockResolvedValue([])
      await patchRoles([])
      expect(prisma.adminRole.update).toHaveBeenCalledTimes(0)
    })

    it('should return 400 if incoherent positions', async () => {
      const updateRoles: Pick<AdminRole, 'id' | 'position'>[] = [
        { id: dbRoles[0].id, position: 1 },
        { id: dbRoles[1].id, position: 1 },
      ]
      prisma.adminRole.findMany.mockResolvedValue(dbRoles)

      const response = await patchRoles(updateRoles)

      expect(response).instanceOf(BadRequest400)
      expect(prisma.adminRole.update).toHaveBeenCalledTimes(0)
    })
    it('should return 400 if incoherent positions (missing roles)', async () => {
      const updateRoles: Pick<AdminRole, 'id' | 'position'>[] = [
        { id: dbRoles[1].id, position: 1 },
      ]
      prisma.adminRole.findMany.mockResolvedValue(dbRoles)

      const response = await patchRoles(updateRoles)

      expect(response).instanceOf(BadRequest400)
      expect(prisma.adminRole.update).toHaveBeenCalledTimes(0)
    })
    it('should update positions', async () => {
      const updateRoles: Pick<AdminRole, 'id' | 'position'>[] = [
        { id: dbRoles[0].id, position: 1 },
        { id: dbRoles[1].id, position: 0 },
      ]
      prisma.adminRole.findMany.mockResolvedValue(dbRoles)

      await patchRoles(updateRoles)

      expect(prisma.adminRole.update).toHaveBeenCalledTimes(2)
    })
    it('should update permissions', async () => {
      const updateRoles: (Pick<AdminRole, 'id'> & { permissions?: string })[] = [
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
          type: 'custom',
        },
        where: {
          id: dbRoles[1].id,
        },
      })
    })

    it('should return 403 if trying to update system role', async () => {
      const systemRole = {
        id: faker.string.uuid(),
        type: 'system',
        name: 'sys',
        permissions: 0n,
        position: 0,
      }
      prisma.adminRole.findMany.mockResolvedValue([systemRole as any])

      const response = await patchRoles([{ id: systemRole.id, name: 'new name' }])
      expect(response).toBeInstanceOf(Forbidden403)
      expect(prisma.adminRole.update).not.toHaveBeenCalled()
    })
  })
})
