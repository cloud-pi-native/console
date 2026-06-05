import type { Prisma } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../auth-user.decorator'
import type { AuthProvider, AuthRequirements } from '../auth.utils'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../database/prisma.service'

interface KeycloakPayload {
  sub: string
  email: string
  given_name: string
  family_name: string
  groups: string[]
}

@Injectable()
export class KeycloakJwtService implements AuthProvider {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
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
    const authHeader = headers.authorization
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return undefined
    }

    try {
      const jwt = authHeader.slice(7)
      const payload = await this.jwtService.verifyAsync(jwt)
      return await this.validatePayload(payload, requirements)
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Authentication failed',
      )
    }
  }

  async validatePayload(
    payload: KeycloakPayload,
    requirements?: AuthRequirements,
  ): Promise<UserContext> {
    const authRequirements = normalizeRequirements(requirements)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: makeUserSelect(authRequirements),
    })
    if (!user) {
      throw new UnauthorizedException('Not authenticated')
    }

    let adminPermissions: bigint | undefined
    let mergedRoleIds: string[] | undefined

    if (authRequirements.includeAdminRoleIds) {
      const adminRoleIds = 'adminRoleIds' in user ? user.adminRoleIds : []
      const groups = payload.groups

      const matchingAdminRoles = await this.prisma.adminRole.findMany({
        where: {
          OR: [
            { oidcGroup: { in: groups } },
            { id: { in: adminRoleIds } },
            { type: 'global' },
          ],
        },
      })

      const activeAdminRoles = matchingAdminRoles.filter(({ oidcGroup, type }) =>
        type === 'global' || !oidcGroup || groups.includes(oidcGroup),
      )

      mergedRoleIds = [...new Set(activeAdminRoles.map(({ id }) => id))]
      adminPermissions = activeAdminRoles.reduce((acc, curr) => acc | curr.permissions, 0n)
    }

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: {
        ...(mergedRoleIds ? { adminRoleIds: mergedRoleIds } : {}),
        lastLogin: new Date().toISOString(),
      },
    })

    return {
      userId: payload.sub,
      adminPermissions,
      userType: 'type' in user ? user.type : undefined,
    }
  }
}

function makeUserSelect(requirements: Required<AuthRequirements>) {
  return {
    id: true,
    ...(requirements.includeAdminRoleIds ? { adminRoleIds: true } : {}),
    ...(requirements.includeUserType ? { type: true } : {}),
  } satisfies Prisma.UserSelect
}

function normalizeRequirements(requirements: AuthRequirements = {}): Required<AuthRequirements> {
  return {
    includeAdminRoleIds: requirements.includeAdminRoleIds ?? true,
    includeUserType: requirements.includeUserType ?? true,
  }
}
