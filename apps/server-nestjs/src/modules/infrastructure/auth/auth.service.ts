import type { FastifyRequest } from 'fastify'
import { createHash } from 'node:crypto'
import { tokenHeaderName } from '@cpn-console/shared'
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../database/prisma.service'
import { KeycloakJwtService } from './keycloak-jwt/keycloak-jwt.service'

export interface UserContext {
  userId: string
  adminPermissions: bigint
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(KeycloakJwtService) private readonly keycloakJwtService: KeycloakJwtService,
  ) {}

  async authenticateHeaders(headers: FastifyRequest['headers']): Promise<UserContext> {
    const dsoTokenResult = await this.authenticateDsoToken(headers)
    if (dsoTokenResult) {
      return dsoTokenResult
    }

    const bearerTokenResult = await this.authenticateBearerToken(headers)
    if (bearerTokenResult) {
      return bearerTokenResult
    }

    throw new UnauthorizedException()
  }

  private async authenticateDsoToken(headers: FastifyRequest['headers']): Promise<UserContext | undefined> {
    const tokenValue = headers[tokenHeaderName]
    if (typeof tokenValue !== 'string') {
      return undefined
    }
    return this.validateToken(tokenValue)
  }

  private async authenticateBearerToken(headers: FastifyRequest['headers']): Promise<UserContext | undefined> {
    const authHeader = headers.authorization
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return undefined
    }

    try {
      const jwt = authHeader.slice(7)
      const payload = await this.jwtService.verifyAsync(jwt)
      return this.keycloakJwtService.validatePayload(payload)
    } catch {
      throw new UnauthorizedException()
    }
  }

  async validateToken(rawToken: string): Promise<UserContext> {
    this.logger.debug(`validateToken started`)
    const hash = createHash('sha256').update(rawToken).digest('hex')
    const result = await this.findAndValidateToken(hash)
    if (!result) {
      this.logger.warn(`validateToken token not found`)
      throw new UnauthorizedException('Not authenticated')
    }
    this.logger.debug(`validateToken token found, resolving permissions`)

    const globalRoles = await this.prisma.adminRole.findMany({
      where: { type: 'global' },
      select: { permissions: true },
    })
    const globalPerms = globalRoles.reduce((acc, curr) => acc | curr.permissions, 0n)

    const tokenPerms = await this.resolveTokenPermissions(result)

    this.logger.debug(`validateToken completed (userId=${result.userId})`)

    return {
      userId: result.userId,
      adminPermissions: globalPerms | tokenPerms,
    }
  }

  private async findAndValidateToken(hash: string) {
    const pat = await this.prisma.personalAccessToken.findFirst({
      where: { hash },
      include: { owner: true },
    })
    if (pat) {
      this.assertTokenValid(pat)
      await this.updateLastUse('personalAccessToken', pat.id, pat.owner.id)
      return { kind: 'personal' as const, userId: pat.owner.id, ownerAdminRoleIds: pat.owner.adminRoleIds }
    }

    const adminToken = await this.prisma.adminToken.findFirst({
      where: { hash },
      include: { owner: true },
    })
    if (adminToken) {
      this.assertTokenValid(adminToken)
      await this.updateLastUse('adminToken', adminToken.id, adminToken.owner.id)
      return { kind: 'admin' as const, userId: adminToken.owner.id, permissions: adminToken.permissions }
    }

    return undefined
  }

  private assertTokenValid(token: { status: string, expirationDate: Date | null }) {
    if (token.status !== 'active') {
      throw new UnauthorizedException('Not active')
    }
    if (token.expirationDate && Date.now() > token.expirationDate.getTime()) {
      throw new UnauthorizedException('Expired')
    }
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

  private async resolveTokenPermissions(
    result: { kind: 'admin', permissions: bigint } | { kind: 'personal', ownerAdminRoleIds: string[] },
  ): Promise<bigint> {
    if (result.kind === 'admin') {
      return result.permissions
    }
    if (!result.ownerAdminRoleIds.length) {
      return 0n
    }
    const roles = await this.prisma.adminRole.findMany({
      where: { id: { in: result.ownerAdminRoleIds } },
    })
    return roles.reduce((acc, curr) => acc | curr.permissions, 0n)
  }
}
