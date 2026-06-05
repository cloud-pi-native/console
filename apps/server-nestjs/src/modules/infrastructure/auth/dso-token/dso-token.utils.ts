import type { AdminToken, Prisma, User } from '@prisma/client'
import type { AuthRequirements } from '../auth.utils'
import { UnauthorizedException } from '@nestjs/common'

export type AuthToken
  = | { kind: 'admin', userId: string, permissions: bigint, userType?: User['type'] }
    | { kind: 'personal', userId: string, ownerAdminRoleIds?: string[], userType?: User['type'] }

export function makeAdminTokenSelect(requirements?: AuthRequirements): Prisma.AdminTokenSelect {
  const includeAdminRoleIds = requirements?.includeAdminRoleIds ?? false
  const includeUserType = requirements?.includeUserType ?? false

  return {
    id: true,
    name: true,
    ...(includeAdminRoleIds ? { owner: { select: { adminRoleIds: true } } } : {}),
    ...(includeUserType ? { owner: { select: { type: true } } } : {}),
    ...(includeAdminRoleIds && includeUserType ? { owner: { select: { adminRoleIds: true, type: true } } } : {}),
  } satisfies Prisma.AdminTokenSelect
}

export function makePersonalAccessTokenSelect(requirements?: AuthRequirements): Prisma.PersonalAccessTokenSelect {
  const includeAdminRoleIds = requirements?.includeAdminRoleIds ?? false
  const includeUserType = requirements?.includeUserType ?? false

  return {
    id: true,
    name: true,
    owner: {
      select: {
        id: true,
        ...(includeAdminRoleIds ? { adminRoleIds: true } : {}),
        ...(includeUserType ? { type: true } : {}),
        ...(includeAdminRoleIds && includeUserType ? { adminRoleIds: true, type: true } : {}),
      },
    },
  } satisfies Prisma.PersonalAccessTokenSelect
}

export interface PersonalAccessTokenWithOwner {
  id: string
  status: AdminToken['status']
  expirationDate: Date | null
  owner: {
    id: string
    adminRoleIds?: string[] | null
    type?: User['type'] | null
  }
}

export interface AdminTokenWithOwner {
  id: string
  status: AdminToken['status']
  expirationDate: Date | null
  owner: {
    id: string
    adminRoleIds?: string[] | null
    type?: User['type'] | null
  }
}

export type Token = PersonalAccessTokenWithOwner | AdminTokenWithOwner

export function validateToken(token: Token): void {
  if (token.expirationDate && token.expirationDate < new Date()) {
    throw new UnauthorizedException(`Token expired: ${token.expirationDate}`)
  }

  if (token.status === 'revoked') {
    throw new UnauthorizedException('Token revoked')
  }
}
