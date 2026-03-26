import type { ExecutionContext } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import type { Mock } from 'vitest'
import { ADMIN_PERMS } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrismaService } from '../../database/prisma.service'
import { RoleGuard } from './role.guard'

describe('roleGuard', () => {
  let guard: RoleGuard
  let prismaService: { adminRole: { findMany: Mock } }

  beforeEach(async () => {
    prismaService = {
      adminRole: {
        findMany: vi.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleGuard,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile()

    guard = module.get<RoleGuard>(RoleGuard)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return true and not set ability if context is not http', async () => {
    const context = {
      getType: vi.fn().mockReturnValue('rpc'),
    } as unknown as ExecutionContext

    const result = await guard.canActivate(context)

    expect(result).toBe(true)
    expect(context.getType).toHaveBeenCalled()
  })

  it('should return true and not set ability if user has no groups', async () => {
    const request = { user: {} }
    const context = {
      getType: vi.fn().mockReturnValue('http'),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext

    const result = await guard.canActivate(context)

    expect(result).toBe(true)
    expect((request as any).ability).toBeUndefined()
  })

  it('should assign manage:all ability for admin users', async () => {
    const request: any = { user: { groups: ['admin-group'] } }
    const context = {
      getType: vi.fn().mockReturnValue('http'),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext

    prismaService.adminRole.findMany.mockResolvedValue([
      { permissions: ADMIN_PERMS.MANAGE.toString() },
    ])

    const result = await guard.canActivate(context)

    expect(result).toBe(true)
    expect(prismaService.adminRole.findMany).toHaveBeenCalledWith({
      where: { oidcGroup: { in: ['admin-group'] } },
      select: { permissions: true },
    })
    expect(request.ability).toBeDefined()
    expect(request.ability.can('manage', 'all')).toBe(true)
  })

  it('should aggregate permissions and map correctly', async () => {
    const request: any = { user: { groups: ['group-1', 'group-2'] } }
    const context = {
      getType: vi.fn().mockReturnValue('http'),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext

    // Mock two roles with different permissions
    const perm1 = ADMIN_PERMS.LIST_USERS
    const perm2 = ADMIN_PERMS.MANAGE_PROJECTS
    prismaService.adminRole.findMany.mockResolvedValue([
      { permissions: perm1.toString() },
      { permissions: perm2.toString() },
    ])

    const result = await guard.canActivate(context)

    expect(result).toBe(true)
    expect(request.ability.can('read', 'AdminUser')).toBe(true)
    expect(request.ability.can('manage', 'AdminProject')).toBe(true)
    // Should not have manage all or manage users
    expect(request.ability.can('manage', 'all')).toBe(false)
    expect(request.ability.can('manage', 'AdminUser')).toBe(false)
  })
})
