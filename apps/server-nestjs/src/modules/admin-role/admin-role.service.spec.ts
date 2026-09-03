import type { EventEmitter2 } from '@nestjs/event-emitter'
import type { PrismaService } from '../infrastructure/database/prisma.service'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import {
  makeAdminRole,
  makeCreateAdminRoleBody,
  makePatchAdminRoleBody,
} from './admin-role-testing.utils'
import { AdminRoleService } from './admin-role.service'

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

  it('patch does not throw on coherent positions and emits upsert per role', async () => {
    const roleA = makeAdminRole({ id: 'a', name: 'A', position: 1 })
    const roleB = makeAdminRole({ id: 'b', name: 'B', position: 2 })
    const patchedA = makePatchAdminRoleBody(roleA, { name: 'A-renamed' })
    const patchedB = makePatchAdminRoleBody(roleB, { name: 'B-renamed' })

    prisma.adminRole.findMany.mockResolvedValue([roleA, roleB])
    prisma.adminRole.findFirst.mockResolvedValueOnce(roleA).mockResolvedValueOnce(roleB)
    prisma.user.findMany.mockResolvedValue([])
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(prisma))

    const service = new AdminRoleService(prisma, eventEmitter)
    await expect(service.patch([patchedA, patchedB])).resolves.toBeDefined()
    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(2)
  })
})
