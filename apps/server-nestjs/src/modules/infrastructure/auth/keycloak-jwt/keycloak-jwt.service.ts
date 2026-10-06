import type { Prisma } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { IncomingHttpHeaders } from 'node:http'
import type { UserContext } from '../auth-user.decorator'
import type { AuthProvider, AuthRequirements } from '../auth.utils'
import type { UserRecord } from './keycloak-jwt-queries.utils'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { z } from 'zod'
import { PrismaService } from '../../database/prisma.service'
import { listMatchingAdminRoles, makeUserSelect, upsertUser } from './keycloak-jwt-queries.utils'

const KeycloakPayloadSchema = z.object({
  sub: z.string(),
  email: z.string().optional().default(''),
  given_name: z.string().optional().default(''),
  family_name: z.string().optional().default(''),
  groups: z.array(z.string()).optional().default([]),
})

type KeycloakPayload = z.infer<typeof KeycloakPayloadSchema>

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
    headers: IncomingHttpHeaders,
    requirements?: AuthRequirements,
  ): Promise<UserContext | undefined> {
    const authHeader = headers.authorization
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return undefined
    }

    try {
      const jwt = authHeader.slice(7)
      const payload = await this.jwtService.verifyAsync(jwt)
      const parsedPayload = KeycloakPayloadSchema.parse(payload)
      return await this.validatePayload(parsedPayload, requirements)
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
    return this.prisma.$transaction(async (tx) => {
      const user = await upsertUser(tx, payload, makeUserSelect(requirements))

      return {
        userId: payload.sub,
        adminPermissions: await this.maybeAdminPermissions(tx, payload, user.adminRoleIds ?? [], requirements),
        userType: this.maybeUserType(user, requirements),
      }
    })
  }

  private async maybeAdminPermissions(tx: Prisma.TransactionClient, payload: KeycloakPayload, adminRoleIds: string[], requirements?: AuthRequirements) {
    if (!(requirements?.includeAdminRoleIds ?? true)) {
      return undefined
    }
    const matchingAdminRoles = await listMatchingAdminRoles(tx, payload.groups, adminRoleIds)
    return matchingAdminRoles.reduce((acc, curr) => acc | curr.permissions, 0n)
  }

  private maybeUserType(user: UserRecord, requirements?: AuthRequirements) {
    return requirements?.includeUserType ?? true ? user.type : undefined
  }
}
