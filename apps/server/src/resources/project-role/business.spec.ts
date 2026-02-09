import { faker } from '@faker-js/faker'
import { describe, expect, it, vi } from 'vitest'
import type { Project, ProjectMembers, ProjectRole } from '@prisma/client'
import prisma from '../../__mocks__/prisma.js'
import { countRolesMembers, createRole, deleteRole, listRoles, patchRoles } from './business.ts'
import { Forbidden403, BadRequest400 } from '@/utils/errors.js'

vi.mock('../../utils/hook-wrapper.ts', () => ({
  hook: {
    project: {
      upsert: vi.fn(),
      delete: vi.fn(),
      getSecrets: vi.fn(),
    },
    projectRole: {
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      retrieveUserByEmail: vi.fn(),
    },
  },
}))

describe('test project-role business', () => {
  const project: Project = {
    id: faker.string.uuid(),
    name: faker.lorem.word({ length: { min: 2, max: 10 } }),
    slug: faker.lorem.word({ length: { min: 2, max: 10 } }),
    limitless: false,
    hprodCpu: faker.number.int({ min: 0, max: 1000 }),
    hprodGpu: faker.number.int({ min: 0, max: 1000 }),
    hprodMemory: faker.number.int({ min: 0, max: 1000 }),
    prodCpu: faker.number.int({ min: 0, max: 1000 }),
    prodGpu: faker.number.int({ min: 0, max: 1000 }),
    prodMemory: faker.number.int({ min: 0, max: 1000 }),
    description: faker.lorem.sentence({ min: 2, max: 10 }),
    status: 'created',
    locked: false,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    everyonePerms: 0n,
    ownerId: faker.string.uuid(),
    lastSuccessProvisionningVersion: null,
  }
  const projectId = faker.string.uuid()

  describe('listRoles', () => {
    it('should stringify bigint', async () => {
      const dbRole: ProjectRole = {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        projectId,
        permissions: 4n,
        position: 0,
        oidcGroup: '',
        type: 'custom',
      }

      prisma.projectRole.findMany.mockResolvedValueOnce([dbRole])
      prisma.projectRole.findMany.mockResolvedValueOnce([dbRole])
      const response = await listRoles(projectId)
      expect(response).toContainEqual(expect.objectContaining({ permissions: '4' }))
    })

    it('should strip oidcGroup prefix', async () => {
      const dbRole: ProjectRole = {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        projectId,
        permissions: 4n,
        position: 0,
        oidcGroup: `/${project.slug}/console/admin`,
        type: 'custom',
      }

      prisma.project.findUnique.mockResolvedValueOnce(project)
      prisma.projectRole.findMany.mockResolvedValueOnce([dbRole])

      const response = await listRoles(projectId)
      expect(response[0].oidcGroup).toBe('/console/admin')
    })
  })

  describe('createRole', () => {
    it('should create role with incremented position when position 0 is the highest', async () => {
      const dbRole: ProjectRole = {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        projectId,
        permissions: 4n,
        position: 0,
        oidcGroup: '',
        type: 'custom',
      }

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.projectRole.findFirst.mockResolvedValueOnce(dbRole)
      prisma.projectRole.create.mockResolvedValue(dbRole)
      prisma.projectRole.findMany.mockResolvedValueOnce([dbRole])
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

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.projectRole.findFirst.mockResolvedValueOnce(dbRole)
      prisma.projectRole.create.mockResolvedValue(dbRole)
      prisma.projectRole.findMany.mockResolvedValueOnce([dbRole])
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

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.projectRole.findFirst.mockResolvedValueOnce(null)
      prisma.projectRole.create.mockResolvedValue(dbRole)
      prisma.projectRole.findMany.mockResolvedValueOnce([dbRole])
      prisma.projectRole.findFirst.mockResolvedValueOnce(null)
      prisma.projectRole.create.mockResolvedValue(dbRole)
      prisma.projectRole.findMany.mockResolvedValueOnce([dbRole])
      await createRole(projectId, { name: 'test', permissions: '4' })

      expect(prisma.projectRole.create).toHaveBeenCalledWith({ data: { name: 'test', permissions: 4n, position: 0, projectId } })
    })

    it('should create role with enforced oidcGroup prefix', async () => {
      const dbRole: any = {
        id: faker.string.uuid(),
        name: faker.string.alphanumeric(),
        projectId,
        permissions: 4n,
        position: 0,
        oidcGroup: `/${project.slug}/console/admin`,
        type: 'custom',
      }

      prisma.project.findUnique.mockResolvedValueOnce(project)
      prisma.projectRole.findFirst.mockResolvedValueOnce(dbRole)
      prisma.projectRole.create.mockResolvedValue(dbRole)
      prisma.projectRole.findMany.mockResolvedValueOnce([dbRole])

      await createRole(projectId, { name: 'test', permissions: '4', oidcGroup: '/console/admin' })

      expect(prisma.projectRole.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          oidcGroup: `/${project.slug}/console/admin`,
        }),
      }))
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

      prisma.projectRole.findUnique.mockResolvedValue(dbRole)
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
      prisma.projectRole.findUnique.mockResolvedValue(dbRole)

      const result = await deleteRole(roleId)

      await expect(result).toBeInstanceOf(Forbidden403)
      expect(prisma.projectRole.delete).not.toHaveBeenCalled()
    })
  })
  describe.skip('countRolesMembers', () => {
    it('should return aggregated role member counts', async () => {
      const roles = [{
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
        roleIds: [roles[0].id, roles[1].id],
      }, {
        userId: faker.string.uuid(),
        projectId,
        roleIds: [roles[1].id],
      }] as const satisfies ProjectMembers[]

      prisma.projectRole.findMany.mockResolvedValue(roles)
      prisma.projectMembers.findMany.mockResolvedValue(members)

      const response = await countRolesMembers(projectId)

      expect(response).toEqual({ [roles[0].id]: 1, [roles[1].id]: 2 })
    })
  })

  describe('patchRoles', () => {
    const dbRoles: ProjectRole[] = [{
      id: faker.string.uuid(),
      name: faker.string.alphanumeric(),
      permissions: faker.number.bigInt({ min: 0n, max: 50000n }),
      position: 0,
      projectId,
      oidcGroup: 'group1',
      type: 'custom',
    }, {
      id: faker.string.uuid(),
      name: faker.string.alphanumeric(),
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
      prisma.project.findUnique.mockResolvedValue({ name: 'My Project', slug: 'myproject' } as any)
      prisma.projectRole.findMany.mockResolvedValue([systemRole])

      const updateRoles = [{
        id: systemRole.id,
        name: 'New Admin Name',
      }]

      const result = await patchRoles(projectId, updateRoles)

      await expect(result).toBeInstanceOf(Forbidden403)
      expect(prisma.projectRole.update).toHaveBeenCalledTimes(0)
    })

    it('should do nothing', async () => {
      prisma.project.findUnique.mockResolvedValue(project)
      prisma.projectRole.findMany.mockResolvedValue([])
      await patchRoles(projectId, [])
      expect(prisma.projectRole.update).toHaveBeenCalledTimes(0)
    })

    it('should return 400 if incoherent positions', async () => {
      const updateRoles: Pick<ProjectRole, 'id' | 'position'>[] = [
        { id: dbRoles[0].id, position: 1 },
        { id: dbRoles[1].id, position: 1 },
      ]
      prisma.project.findUnique.mockResolvedValue(project)
      prisma.projectRole.findMany.mockResolvedValue(dbRoles)

      const response = await patchRoles(projectId, updateRoles)

      expect(response).instanceOf(BadRequest400)
      expect(prisma.projectRole.update).toHaveBeenCalledTimes(0)
    })

    it('should return 400 if incoherent positions (missing)', async () => {
      const updateRoles: Pick<ProjectRole, 'id' | 'position'>[] = [
        { id: dbRoles[1].id, position: 1 },
      ]
      prisma.project.findUnique.mockResolvedValue(project)
      prisma.projectRole.findMany.mockResolvedValue(dbRoles)

      const response = await patchRoles(projectId, updateRoles)

      expect(response).instanceOf(BadRequest400)
      expect(prisma.projectRole.update).toHaveBeenCalledTimes(0)
    })

    it('should update positions', async () => {
      const updateRoles: Pick<ProjectRole, 'id' | 'position'>[] = [
        { id: dbRoles[0].id, position: 1 },
        { id: dbRoles[1].id, position: 0 },
      ]
      prisma.project.findUnique.mockResolvedValue(project)
      prisma.projectRole.findMany.mockResolvedValue(dbRoles)

      await patchRoles(projectId, updateRoles)

      expect(prisma.projectRole.update).toHaveBeenCalledTimes(2)
    })

    it('should update permissions', async () => {
      const updateRoles: (Pick<ProjectRole, 'id'> & { permissions: string })[] = [
        { id: dbRoles[1].id, permissions: '0' },
      ]
      prisma.project.findUnique.mockResolvedValue(project)
      prisma.projectRole.findMany.mockResolvedValue(dbRoles)

      await patchRoles(projectId, updateRoles)

      expect(prisma.projectRole.update).toHaveBeenCalledWith(expect.objectContaining({
        data: {
          name: dbRoles[1].name,
          permissions: 0n,
          position: 1,
          oidcGroup: dbRoles[1].oidcGroup,
          projectId,
          type: 'custom',
        },
        where: {
          id: dbRoles[1].id,
        },
      }))
    })

    it('should update role with enforced oidcGroup prefix', async () => {
      const updateRoles: any[] = [
        { id: dbRoles[1].id, oidcGroup: '/console/admin' },
      ]

      prisma.project.findUnique.mockResolvedValue(project)

      const dbRoleWithPrefix = { ...dbRoles[1], oidcGroup: `/${project.slug}/console/group2` }
      prisma.projectRole.findMany.mockResolvedValue([dbRoleWithPrefix])

      await patchRoles(projectId, updateRoles)

      expect(prisma.projectRole.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          oidcGroup: `/${project.slug}/console/admin`,
        }),
      }))
    })
  })
})
