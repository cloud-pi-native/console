import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import type { ProjectMembers, ProjectRole } from '@prisma/client'
import prisma from '../../__mocks__/prisma.js'
import { BadRequest400, Forbidden403 } from '../../utils/errors.ts'
import { countRolesMembers, createRole, deleteRole, listRoles, patchRoles } from './business.ts'

const projectId = faker.string.uuid()
describe('test project-role business', () => {
  describe('listRoles', () => {
    it('should stringify bigint', async () => {
      const partialRole: ProjectRole = {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        projectId,
        permissions: 4n,
        position: 0,
        oidcGroup: '',
        type: 'custom',
      }

      prisma.projectRole.findMany.mockResolvedValueOnce([partialRole as any])
      const response = await listRoles(projectId)
      expect(response).toContainEqual(expect.objectContaining({ permissions: '4', type: 'custom' }))
    })
  })

  describe('createRole', () => {
    it('should create role with incremented position when position 0 is the highest', async () => {
      const dbRole: ProjectRole = {
        id: faker.string.uuid(),
        name: 'custom-role',
        projectId,
        permissions: 4n,
        position: 0,
        oidcGroup: '',
        type: 'custom',
      }

      prisma.projectRole.findFirst.mockResolvedValueOnce(dbRole)
      prisma.projectRole.findMany.mockResolvedValueOnce([dbRole])
      prisma.projectRole.create.mockResolvedValue(dbRole)
      await createRole(projectId, { name: 'test', permissions: '4' })

      expect(prisma.projectRole.create).toHaveBeenCalledWith({ data: { name: 'test', permissions: 4n, position: 1, projectId } })
    })

    it('should create role with incremented position with bigger position', async () => {
      const dbRole: ProjectRole = {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        projectId,
        permissions: 4n,
        position: 50,
        oidcGroup: '',
        type: 'custom',
      }

      prisma.projectRole.findFirst.mockResolvedValueOnce(dbRole)
      prisma.projectRole.findMany.mockResolvedValueOnce([dbRole])
      prisma.projectRole.create.mockResolvedValue(dbRole)
      await createRole(projectId, { name: 'test', permissions: '4' })

      expect(prisma.projectRole.create).toHaveBeenCalledWith({ data: { name: 'test', permissions: 4n, position: 51, projectId } })
    })

    it('should create role with incremented position with no role in db', async () => {
      const dbRole: ProjectRole = {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        projectId,
        permissions: 4n,
        position: 50,
        oidcGroup: '',
        type: 'custom',
      }

      prisma.projectRole.findFirst.mockResolvedValueOnce(null)
      prisma.projectRole.findMany.mockResolvedValueOnce([dbRole])
      prisma.projectRole.create.mockResolvedValue(dbRole)
      await createRole(projectId, { name: 'test', permissions: '4' })

      expect(prisma.projectRole.create).toHaveBeenCalledWith({ data: { name: 'test', permissions: 4n, position: 0, projectId } })
    })
  })

  describe('deleteRole', () => {
    const roleId = faker.string.uuid()
    it('should delete role and remove id from concerned users', async () => {
      const dbRole: ProjectRole = {
        id: roleId,
        name: faker.string.alphanumeric(),
        projectId,
        permissions: 4n,
        position: 50,
        oidcGroup: '',
        type: 'custom',
      }
      const members = [{
        userId: faker.string.uuid(),
        projectId,
        roleIds: [roleId],
      }, {
        userId: faker.string.uuid(),
        projectId,
        roleIds: [roleId, faker.string.uuid()],
      }] as const satisfies Partial<ProjectMembers>[]

      prisma.projectRole.findUnique.mockResolvedValueOnce(dbRole)
      prisma.projectMembers.findMany.mockResolvedValueOnce(members)
      prisma.projectRole.findMany.mockResolvedValueOnce([])
      prisma.projectRole.delete.mockResolvedValue(dbRole)
      await deleteRole(roleId)

      expect(prisma.projectMembers.update).toHaveBeenNthCalledWith(1, { where: expect.any(Object), data: { roleIds: { set: [] } } })
      expect(prisma.projectMembers.update).toHaveBeenNthCalledWith(2, { where: expect.any(Object), data: { roleIds: { set: [members[1].roleIds[1]] } } })
      expect(prisma.projectRole.delete).toHaveBeenCalledWith({ where: { id: roleId } })
    })

    it('should throw Forbidden403 when deleting a system role', async () => {
      const dbRole: ProjectRole = {
        id: roleId,
        name: 'Administrateur',
        projectId,
        permissions: 4n,
        position: 50,
        oidcGroup: '',
        type: 'system',
      }
      prisma.projectRole.findUnique.mockResolvedValueOnce(dbRole)

      await expect(deleteRole(roleId)).rejects.toThrow(Forbidden403)
      expect(prisma.projectRole.delete).not.toHaveBeenCalled()
    })
  })
  describe.skip('countRolesMembers', () => {
    it('should return aggregated role member counts', async () => {
      const partialRoles = [{
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        projectId,
        permissions: 4n,
        position: 50,
        oidcGroup: '',
        type: 'custom',
      }, {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        projectId,
        permissions: 4n,
        position: 50,
        oidcGroup: '',
        type: 'custom',
      }] as const satisfies ProjectRole[]

      const members = [{
        userId: faker.string.uuid(),
        projectId,
        roleIds: [partialRoles[0].id, partialRoles[1].id],
      }, {
        userId: faker.string.uuid(),
        projectId,
        roleIds: [partialRoles[1].id],
      }] as const satisfies ProjectMembers[]

      prisma.projectRole.findMany.mockResolvedValue(partialRoles)
      prisma.projectMembers.findMany.mockResolvedValue(members)

      const response = await countRolesMembers(projectId)

      expect(response).toEqual({ [partialRoles[0].id]: 1, [partialRoles[1].id]: 2 })
    })
  })
  describe('patchRoles', () => {
    const dbRoles: any[] = [{
      id: faker.string.uuid(),
      name: faker.company.name(),
      permissions: faker.number.bigInt({ min: 0n, max: 50000n }),
      position: 0,
      projectId,
      oidcGroup: 'group1',
      type: 'custom',
    }, {
      id: faker.string.uuid(),
      name: faker.company.name(),
      permissions: faker.number.bigInt({ min: 0n, max: 50000n }),
      position: 1,
      projectId,
      oidcGroup: 'group2',
      type: 'custom',
    }]

    it('should throw Forbidden403 when renaming a system role', async () => {
      const systemRole: ProjectRole = {
        id: faker.string.uuid(),
        name: 'Administrateur',
        permissions: 10n,
        position: 0,
        projectId,
        oidcGroup: 'admin-group',
        type: 'system',
      }
      prisma.projectRole.findMany.mockResolvedValue([systemRole])

      const updateRoles = [{
        id: systemRole.id,
        name: 'New Admin Name',
      }]

      await expect(patchRoles(projectId, updateRoles)).rejects.toThrow(Forbidden403)
      expect(prisma.projectRole.update).toHaveBeenCalledTimes(0)
    })

    it('should do nothing', async () => {
      prisma.projectRole.findMany.mockResolvedValue([])
      await patchRoles(projectId, [])
      expect(prisma.projectRole.update).toHaveBeenCalledTimes(0)
    })

    it('should return 400 if incoherent positions', async () => {
      const updateRoles: any = [
        { id: dbRoles[0].id, position: 1 },
        { id: dbRoles[1].id, position: 1 },
      ]
      prisma.projectRole.findMany.mockResolvedValue(dbRoles)

      const response = await patchRoles(projectId, updateRoles)

      expect(response).instanceOf(BadRequest400)
      expect(prisma.projectRole.update).toHaveBeenCalledTimes(0)
    })

    it('should return 400 if incoherent positions (missing)', async () => {
      const updateRoles: any = [
        { id: dbRoles[1].id, position: 1 },
      ]
      prisma.projectRole.findMany.mockResolvedValue(dbRoles)

      const response = await patchRoles(projectId, updateRoles)

      expect(response).instanceOf(BadRequest400)
      expect(prisma.projectRole.update).toHaveBeenCalledTimes(0)
    })

    it('should update positions', async () => {
      const updateRoles: any = [
        { id: dbRoles[0].id, position: 1 },
        { id: dbRoles[1].id, position: 0 },
      ]
      prisma.projectRole.findMany.mockResolvedValue(dbRoles)

      await patchRoles(projectId, updateRoles)

      expect(prisma.projectRole.update).toHaveBeenCalledTimes(2)
    })

    it('should update permissions', async () => {
      const updateRoles: any = [
        { id: dbRoles[1].id, permissions: '0' },
      ]
      prisma.projectRole.findMany.mockResolvedValue(dbRoles)

      await patchRoles(projectId, updateRoles)

      expect(prisma.projectRole.update).toHaveBeenCalledTimes(1)
      expect(prisma.projectRole.update).toHaveBeenCalledWith({
        data: {
          name: dbRoles[1].name,
          permissions: 0n,
          position: 1,
          oidcGroup: dbRoles[1].oidcGroup,
          type: 'custom',
        },
        where: {
          id: dbRoles[1].id,
        },
      })
    })
  })
})
