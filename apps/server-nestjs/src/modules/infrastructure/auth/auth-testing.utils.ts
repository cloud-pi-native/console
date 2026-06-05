import type { ExecutionContext } from '@nestjs/common'
import type { HttpArgumentsHost } from '@nestjs/common/interfaces'
import type { AdminToken, PersonalAccessToken, User } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { UserContext } from './auth-user.decorator'
import { mockDeep } from 'vitest-mock-extended'

export function makeExecutionContext(headers: FastifyRequest['headers'] = {}): DeepMockProxy<ExecutionContext> {
  const context = mockDeep<ExecutionContext>()
  const httpArgumentsHost = mockDeep<HttpArgumentsHost>()
  const request = mockDeep<UserContext & FastifyRequest>()

  request.headers = headers
  httpArgumentsHost.getRequest.mockReturnValue(request)
  context.switchToHttp.mockReturnValue(httpArgumentsHost)

  return context
}

export function makePersonalAccessToken(overrides: {
  id?: string
  userId?: string
  adminRoleIds?: string[]
  type?: User['type']
  status?: PersonalAccessToken['status']
  expirationDate?: PersonalAccessToken['expirationDate']
  lastUse?: PersonalAccessToken['lastUse']
} = {}): PersonalAccessToken & { owner: { id: string, adminRoleIds: string[], type: string } } {
  const id = overrides.id ?? 'pat-id'
  const ownerId = overrides.userId ?? 'owner-id'
  return {
    id,
    name: 'test-token',
    status: overrides.status ?? 'active',
    expirationDate: overrides.expirationDate ?? new Date(Date.now() + 86400000),
    lastUse: overrides.lastUse ?? null,
    createdAt: new Date(),
    hash: 'hash',
    userId: ownerId,
    owner: {
      id: ownerId,
      adminRoleIds: overrides.adminRoleIds ?? [],
      type: overrides.type ?? 'human',
    },
  }
}

export function makeAdminToken(overrides: {
  id?: string
  userId?: string
  adminRoleIds?: string[]
  type?: User['type']
  status?: AdminToken['status']
  permissions?: bigint
  expirationDate?: AdminToken['expirationDate']
  lastUse?: AdminToken['lastUse']
} = {}): AdminToken & { owner: { id: string, adminRoleIds: string[], type: string } } {
  const id = overrides.id ?? 'admin-token-id'
  const ownerId = overrides.userId ?? 'owner-id'
  const type = overrides.type ?? 'human'

  return {
    id,
    name: 'admin-token',
    status: overrides.status ?? 'active',
    expirationDate: overrides.expirationDate ?? null,
    permissions: overrides.permissions ?? 256n,
    lastUse: overrides.lastUse ?? null,
    createdAt: new Date(),
    hash: 'hash',
    userId: ownerId,
    owner: {
      id: ownerId,
      adminRoleIds: overrides.adminRoleIds ?? [],
      type,
    },
  }
}
