import { AdminRoleService } from './admin-role.service'
import type { adminRoleContract } from '@cpn-console/shared'
import type { EventEmitter2 } from '@nestjs/event-emitter'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import {
  makeAdminRole,
  makeCreateAdminRoleBody,
} from './admin-role-testing.utils'
import type { PrismaService } from '../infrastructure/database/prisma.service'

describe('adminRoleService', () => {
  let prisma: ReturnType<typeof mockDeep<PrismaService>>
  let eventEmitter: ReturnType<typeof mockDeep<EventEmitter2>>

  beforeEach(() => {
    vi.clearAllMocks()
    prisma = mockDeep<PrismaService>()
    eventEmitter = mockDeep<EventEmitter2>()
    eventEmitter.emitAsync.mockResolvedValue([])
  })

  it('creates a role at the next position and returns the created role', async () => {
    const existingRole = makeAdminRole({
      position: 5,
      permissions: 4n,
      type: 'managed',
    })

    const createdRole = makeAdminRole({
      ...existingRole,
      name: 'New role',
      position: 6,
      permissions: 0n,
    })

    prisma.adminRole.findFirst.mockResolvedValue(existingRole)
    prisma.adminRole.create.mockResolvedValue(createdRole)
    prisma.adminRole.findUnique.mockResolvedValue(createdRole)
    prisma.user.findMany.mockResolvedValue([])
    prisma.$transaction.mockImplementation(async callback => callback(prisma))

    const createBody = makeCreateAdminRoleBody({ name: 'New role' })
    const service = new AdminRoleService(prisma, eventEmitter)
    const result = await service.create(createBody)

    expect(result).toEqual(
      expect.objectContaining({
        id: existingRole.id,
        permissions: '0',
        position: 6,
      }),
    )
    expect(prisma.adminRole.create).toHaveBeenCalledWith({
      data: {
        name: 'New role',
        permissions: 0n,
        position: 6,
      },
      select: {
        id: true,
        name: true,
        oidcGroup: true,
        permissions: true,
        position: true,
        type: true,
      },
    })
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('adminRole.upsert', {
      id: existingRole.id,
      name: 'New role',
      oidcGroup: '',
      permissions: 0n,
      position: 6,
      type: 'managed',
      members: [],
    })
  })
})
