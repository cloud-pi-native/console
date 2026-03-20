import { createHash } from 'node:crypto'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

export interface TokenValidationResult {
  userId: string
  adminPermissions: bigint
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async validateToken(rawToken: string): Promise<TokenValidationResult> {
    const hash = createHash('sha256').update(rawToken).digest('hex')

    const result = await this.findAndValidateToken(hash)
    if (!result) {
      throw new UnauthorizedException('Not authenticated')
    }

    const globalRoles = await this.prisma.adminRole.findMany({
      where: { type: 'global' },
      select: { permissions: true },
    })
    const globalPerms = globalRoles.reduce((acc, curr) => acc | curr.permissions, 0n)

    const tokenPerms = await this.resolveTokenPermissions(result)

    return {
      userId: result.userId,
      adminPermissions: globalPerms | tokenPerms,
    }
  }

  private async findAndValidateToken(hash: string) {
    // Try PersonalAccessToken first, then AdminToken
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
