import type { adminRoleContract } from '@cpn-console/shared'
import type { EventEmitter2 } from '@nestjs/event-emitter'
import type { AdminRole as PrismaAdminRole, User } from '@prisma/client'
import type { PrismaService } from '../infrastructure/database/prisma.service'
import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AdminRoleService } from './admin-role.service'

describe('adminRoleService', () => {
  let prisma: ReturnType<typeof mockDeep<PrismaService>>
  let eventEmitter: ReturnType<typeof mockDeep<EventEmitter2>>
  let service: AdminRoleService

  beforeEach(() => {
    vi.clearAllMocks()
    prisma = mockDeep<PrismaService>()
    eventEmitter = mockDeep<EventEmitter2>()
    eventEmitter.emitAsync.mockResolvedValue([])
    service = new AdminRoleService(prisma, eventEmitter)
  })

  it('lists roles with string permissions', async () => {
    const roles = [{
      id: faker.string.uuid(),
      name: 'Role A',
      permissions: 4n,
      position: 0,
      oidcGroup: '',
      type: 'managed',
    }] as const satisfies PrismaAdminRole[]

    prisma.adminRole.findMany.mockResolvedValue(roles)

    await expect(service.list()).resolves.toEqual([
      expect.objectContaining({
        id: roles[0].id,
        permissions: '4',
        type: 'managed',
      }),
    ])
  })

  it('creates a role at the next position and returns the updated list', async () => {
    const existingRole = {
      id: faker.string.uuid(),
      name: 'Role A',
      permissions: 4n,
      position: 5,
      oidcGroup: '',
      type: 'managed',
    } as const satisfies PrismaAdminRole

    prisma.$transaction.mockImplementation(async callback => callback(prisma))
    prisma.adminRole.findFirst.mockResolvedValue(existingRole)
    prisma.adminRole.findMany.mockResolvedValue([existingRole])
    prisma.adminRole.create.mockResolvedValue(existingRole)
    prisma.adminRole.findUnique.mockResolvedValue(existingRole)
    prisma.user.findMany.mockResolvedValue([])

    await expect(service.create({ name: 'New role' })).resolves.toEqual([
      expect.objectContaining({
        id: existingRole.id,
        permissions: '4',
        position: 5,
      }),
    ])

    expect(prisma.adminRole.create).toHaveBeenCalledWith({
      data: {
        name: 'New role',
        permissions: 0n,
        position: 6,
      },
    })
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('adminRole.upsert', {
      ...existingRole,
      members: [],
    })
  })

  it('patches roles and normalizes permissions', async () => {
    const dbRoles = [{
      id: faker.string.uuid(),
      name: 'Role A',
      permissions: 4n,
      position: 0,
      oidcGroup: '',
      type: 'managed',
    }, {
      id: faker.string.uuid(),
      name: 'Role B',
      permissions: 8n,
      position: 1,
      oidcGroup: '',
      type: 'managed',
    }] as const satisfies PrismaAdminRole[]

    prisma.$transaction.mockImplementation(async callback => callback(prisma))

    const updatedRoles = [{
      ...dbRoles[0],
      name: 'Updated role',
      permissions: 16n,
      position: 1,
    }, {
      ...dbRoles[1],
      position: 0,
    }] as const satisfies PrismaAdminRole[]

    prisma.adminRole.findMany
      .mockResolvedValueOnce(dbRoles)
      .mockResolvedValueOnce(updatedRoles)
    prisma.adminRole.findUnique
      .mockResolvedValueOnce(updatedRoles[0])
      .mockResolvedValueOnce(updatedRoles[1])
    prisma.user.findMany.mockResolvedValue([])

    const updateRoles = [{
      id: dbRoles[0].id,
      name: 'Updated role',
      permissions: '16',
      position: 1,
      type: 'managed',
    }, {
      id: dbRoles[1].id,
      position: 0,
    }] satisfies typeof adminRoleContract.patchAdminRoles.body._type

    await expect(service.patch(updateRoles)).resolves.toEqual([
      expect.objectContaining({
        id: dbRoles[0].id,
        permissions: '16',
        position: 1,
      }),
      expect.objectContaining({
        id: dbRoles[1].id,
        permissions: '8',
        position: 0,
      }),
    ])

    expect(prisma.adminRole.update).toHaveBeenNthCalledWith(1, {
      where: { id: dbRoles[0].id },
      data: {
        name: 'Updated role',
        permissions: 16n,
        position: 1,
        oidcGroup: '',
        type: 'managed',
      },
    })
    expect(prisma.adminRole.update).toHaveBeenNthCalledWith(2, {
      where: { id: dbRoles[1].id },
      data: {
        name: 'Role B',
        permissions: 8n,
        position: 0,
        oidcGroup: '',
        type: 'managed',
      },
    })
    expect(eventEmitter.emitAsync).toHaveBeenNthCalledWith(1, 'adminRole.upsert', {
      ...updatedRoles[0],
      members: [],
    })
    expect(eventEmitter.emitAsync).toHaveBeenNthCalledWith(2, 'adminRole.upsert', {
      ...updatedRoles[1],
      members: [],
    })
  })

  it('rejects incoherent positions', async () => {
    const dbRoles = [{
      id: faker.string.uuid(),
      name: 'Role A',
      permissions: 4n,
      position: 0,
      oidcGroup: '',
      type: 'managed',
    }, {
      id: faker.string.uuid(),
      name: 'Role B',
      permissions: 8n,
      position: 1,
      oidcGroup: '',
      type: 'managed',
    }] as const satisfies PrismaAdminRole[]

    prisma.adminRole.findMany.mockResolvedValue(dbRoles)

    await expect(service.patch([
      { id: dbRoles[0].id, position: 1 },
    ] satisfies typeof adminRoleContract.patchAdminRoles.body._type)).rejects.toThrow('Les numéros de position des rôles sont incohérentes')
  })

  it('counts member references for unscoped roles only', async () => {
    const roles = [{
      id: 'role-a',
      name: 'Role A',
      permissions: 1n,
      position: 0,
      oidcGroup: '',
      type: 'managed',
    }, {
      id: 'role-b',
      name: 'Role B',
      permissions: 2n,
      position: 1,
      oidcGroup: '',
      type: 'managed',
    }] as const satisfies PrismaAdminRole[]

    const users = [{
      id: faker.string.uuid(),
      type: 'human',
      firstName: 'A',
      lastName: 'B',
      email: 'a@example.com',
      adminRoleIds: ['role-a', 'role-b'],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      lastLogin: new Date('2024-01-03T00:00:00.000Z'),
    }, {
      id: faker.string.uuid(),
      type: 'human',
      firstName: 'C',
      lastName: 'D',
      email: 'c@example.com',
      adminRoleIds: ['role-b'],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      lastLogin: new Date('2024-01-03T00:00:00.000Z'),
    }] as const satisfies User[]

    prisma.adminRole.findMany.mockResolvedValue(roles)
    prisma.user.findMany.mockResolvedValue(users)

    await expect(service.memberCounts()).resolves.toEqual({
      'role-a': 1,
      'role-b': 2,
    })
  })

  it('removes the deleted role from users before deleting it', async () => {
    const roleId = faker.string.uuid()
    const users = [{
      id: faker.string.uuid(),
      type: 'human',
      firstName: 'A',
      lastName: 'B',
      email: 'a@example.com',
      adminRoleIds: [roleId],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      lastLogin: new Date('2024-01-03T00:00:00.000Z'),
    }, {
      id: faker.string.uuid(),
      type: 'human',
      firstName: 'C',
      lastName: 'D',
      email: 'c@example.com',
      adminRoleIds: [roleId, faker.string.uuid()],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      lastLogin: new Date('2024-01-03T00:00:00.000Z'),
    }] as const satisfies User[]

    prisma.$transaction.mockImplementation(async callback => callback(prisma))
    prisma.adminRole.findUnique.mockResolvedValue({
      id: roleId,
      name: 'Role',
      permissions: 0n,
      position: 0,
      oidcGroup: '',
      type: 'managed',
    })
    prisma.user.findMany
      .mockResolvedValueOnce(users)
      .mockResolvedValueOnce(users)

    await expect(service.delete(roleId)).resolves.toBeUndefined()

    expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: users[0].id },
      data: { adminRoleIds: [] },
    })
    expect(prisma.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: users[1].id },
      data: { adminRoleIds: [users[1].adminRoleIds[1]] },
    })
    expect(prisma.adminRole.delete).toHaveBeenCalledWith({ where: { id: roleId } })
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('adminRole.delete', {
      id: roleId,
      name: 'Role',
      permissions: 0n,
      position: 0,
      oidcGroup: '',
      type: 'managed',
      members: users.map(({ id, email, firstName, lastName }) => ({
        id,
        email,
        firstName,
        lastName,
      })),
    })
  })
})
