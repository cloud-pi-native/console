import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../auth-user.decorator'
import type { AuthProvider, AuthRequirements } from '../auth.utils'
import type { AdminTokenWithOwner, AuthToken, PersonalAccessTokenWithOwner } from './dso-token.utils'
import { createHash } from 'node:crypto'
import { tokenHeaderName } from '@cpn-console/shared'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { makeAdminTokenSelect, makePersonalAccessTokenSelect, validateToken } from './dso-token.utils'

@Injectable()
export class DsoTokenService implements AuthProvider {
  private readonly logger = new Logger(DsoTokenService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async authenticate(
    request: FastifyRequest,
    requirements?: AuthRequirements,
  ): Promise<UserContext | undefined> {
    return this.authenticateHeaders(request.headers, requirements)
  }

  async authenticateHeaders(
    headers: FastifyRequest['headers'],
    requirements?: AuthRequirements,
  ): Promise<UserContext | undefined> {
    const includeAdminRoleIds = requirements?.includeAdminRoleIds ?? true
    const includeUserType = requirements?.includeUserType ?? true

    const tokenValue = headers[tokenHeaderName]
    if (typeof tokenValue !== 'string') {
      return undefined
    }

    const tokenResult = await this.validateToken(tokenValue, { includeAdminRoleIds, includeUserType })
    if (!tokenResult) return undefined

    const adminPermissions = includeAdminRoleIds
      ? await this.resolveAdminPermissions(tokenResult)
      : undefined

    return {
      userId: tokenResult.userId,
      adminPermissions,
      userType: tokenResult.userType,
    }
  }

  async validateToken(
    rawToken: string,
    requirements: Required<AuthRequirements>,
  ): Promise<AuthToken | undefined> {
    this.logger.debug(`validateToken started`)
    const hash = createHash('sha256').update(rawToken).digest('hex')
    const result = await this.findAndValidateToken(hash, requirements)
    if (!result) {
      this.logger.warn(`validateToken token not found`)
      return undefined
    }
    this.logger.debug(`validateToken completed (userId=${result.userId})`)
    return result
  }

  private async findAndValidateToken(hash: string, requirements: Required<AuthRequirements>): Promise<AuthToken | undefined> {
    const personalAccessTokenResult = await this.findAndValidatePersonalAccessToken(hash, requirements)
    if (personalAccessTokenResult) {
      return personalAccessTokenResult
    }

    const adminTokenResult = await this.findAndValidateAdminToken(hash, requirements)
    if (adminTokenResult) {
      return adminTokenResult
    }

    return undefined
  }

  private async findAndValidatePersonalAccessToken(hash: string, requirements: Required<AuthRequirements>): Promise<AuthToken | undefined> {
    const pat = await this.prisma.personalAccessToken.findFirst({
      select: makePersonalAccessTokenSelect(requirements),
      where: { hash },
    }) satisfies PersonalAccessTokenWithOwner | null
    if (pat) {
      validateToken(pat)
      await this.updateLastUse('personalAccessToken', pat.id, pat.owner.id)
      return {
        kind: 'personal' as const,
        userId: pat.owner.id,
        ownerAdminRoleIds: requirements.includeAdminRoleIds ? (pat.owner.adminRoleIds ?? []) : undefined,
        userType: requirements.includeUserType ? (pat.owner.type ?? undefined) : undefined,
      }
    }

    return undefined
  }

  private async findAndValidateAdminToken(hash: string, requirements: Required<AuthRequirements>): Promise<AuthToken | undefined> {
    const adminToken = await this.prisma.adminToken.findFirst({
      select: makeAdminTokenSelect(requirements),
      where: { hash },
    }) satisfies AdminTokenWithOwner | null
    if (adminToken) {
      validateToken(adminToken)
      await this.updateLastUse('adminToken', adminToken.id, adminToken.owner.id)
      return {
        kind: 'admin' as const,
        userId: adminToken.owner.id,
        permissions: adminToken.permissions,
        userType: adminToken.owner.type ?? undefined,
      }
    }

    return undefined
  }

  private async updateLastUse(model: 'personalAccessToken' | 'adminToken', tokenId: string, userId: string) {
    const now = new Date().toISOString()
    if (model === 'personalAccessToken') {
      await this.prisma.personalAccessToken.update({ where: { id: tokenId }, data: { lastUse: now } })
    } else {
      await this.prisma.adminToken.update({ where: { id: tokenId }, data: { lastUse: now } })
    }
    await this.prisma.user.update({ where: { id: userId }, data: { lastLogin: now } })
  }

  private async resolveAdminPermissions(result: AuthToken): Promise<bigint> {
    const globalRoles = await this.prisma.adminRole.findMany({
      where: { type: 'global' },
      select: { permissions: true },
    })
    const globalPerms = globalRoles.reduce((acc, curr) => acc | curr.permissions, 0n)

    if (result.kind === 'admin') {
      return globalPerms | result.permissions
    }
    const ownerAdminRoleIds = result.ownerAdminRoleIds ?? []
    if (!ownerAdminRoleIds.length) {
      return globalPerms
    }
    const roles = await this.prisma.adminRole.findMany({
      select: { permissions: true },
      where: { id: { in: ownerAdminRoleIds } },
    })
    const tokenPerms = roles.reduce((acc, curr) => acc | curr.permissions, 0n)
    return globalPerms | tokenPerms
  }
}
