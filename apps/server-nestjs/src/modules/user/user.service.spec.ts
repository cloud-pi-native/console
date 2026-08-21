import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { makeAdminRole, makeUser } from './user-testing.utils'
import { UserService } from './user.service'

describe('UserService', () => {
  let service: UserService
  let prisma: DeepMockProxy<PrismaService>
  let events: DeepMockProxy<EventEmitter2>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    events = mockDeep<EventEmitter2>()

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile()

    service = moduleRef.get(UserService)
  })

  it('lists all users with the query filters', async () => {
    const users = [makeUser(), makeUser()]
    prisma.user.findMany.mockResolvedValue(users)

    const result = await service.getAllUsers({}, 'AND')

    expect(result).toEqual(users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      adminRoleIds: user.adminRoleIds,
      type: user.type,
      lastLogin: user.lastLogin?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    })))
    expect(prisma.user.findMany).toHaveBeenCalled()
  })

  it('filters users by admin roles', async () => {
    prisma.adminRole.findMany.mockResolvedValue([makeAdminRole({ name: 'admin' })])
    prisma.user.findMany.mockResolvedValue([makeUser()])

    await service.getAllUsers({ adminRoles: ['admin'] }, 'AND')

    expect(prisma.adminRole.findMany).toHaveBeenCalled()
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: expect.any(Array) },
    }))
  })

  it('throws when an admin role name is not found', async () => {
    prisma.adminRole.findMany.mockResolvedValue([])

    await expect(
      service.getAllUsers({ adminRoles: ['ghost-role'] }, 'AND'),
    ).rejects.toThrow('Unable to find adminRole ghost-role')
  })

  it('returns matching users by letters', async () => {
    const users = [makeUser()]
    prisma.user.findMany.mockResolvedValue(users)

    const result = await service.getMatchingUsers({ letters: 'joh' })

    expect(result).toHaveLength(1)
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: expect.arrayContaining([expect.objectContaining({ type: 'human' })]) },
    }))
  })

  it('patches users and emits adminRole upsert events', async () => {
    const users = [makeUser()]
    prisma.user.update.mockResolvedValue(users[0])
    prisma.user.findMany.mockResolvedValue(users)

    const result = await service.patchUsers([{ id: users[0].id, adminRoleIds: ['role-1'] }])

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: users[0].id },
      data: { adminRoleIds: ['role-1'] },
    })
    expect(events.emitAsync).toHaveBeenCalledWith('adminRole.upsert', { roleId: 'role-1' })
    expect(result).toHaveLength(1)
  })
})
