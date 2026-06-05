import type { Prisma } from '@prisma/client'
import type { Cache } from 'cache-manager'
import type { FastifyRequest } from 'fastify'
import type { AuthRequirements, UserContext } from '../auth.service'
import { createPublicKey } from 'node:crypto'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { z } from 'zod'
import { ConfigurationService } from '../../configuration/configuration.service'
import { PrismaService } from '../../database/prisma.service'
import { KeycloakJwtClientService } from './keycloak-jwt-client.service'

const JwtHeaderSchema = z.object({
  kid: z.string(),
})

export const KeycloakPayloadSchema = z.object({
  sub: z.string(),
  email: z.string().default(''),
  given_name: z.string().default(''),
  family_name: z.string().default(''),
  groups: z.array(z.string()).default([]),
})

export type KeycloakPayload = z.infer<typeof KeycloakPayloadSchema>

@Injectable()
export class KeycloakJwtService {
  private readonly logger = new Logger(KeycloakJwtService.name)

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(KeycloakJwtClientService) private readonly client: KeycloakJwtClientService,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
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
      const jwtService = this.moduleRef.get(JwtService, { strict: false })
      if (!jwtService) {
        throw new Error('JwtService not available')
      }
      const payload = await jwtService.verifyAsync(jwt)
      return this.validatePayload(payload, requirements)
    } catch {
      throw new UnauthorizedException()
    }
  }

  decodeJweHeader(token: string | object | Buffer<ArrayBufferLike>): { kid: string } | null {
    if (typeof token !== 'string') return null
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null
      const raw = JSON.parse(
        Buffer.from(parts[0].replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString(),
      )
      const header = JwtHeaderSchema.safeParse(raw)
      return header.success ? { kid: header.data.kid } : null
    } catch {
      return null
    }
  }

  async getPublicKey(kid: string): Promise<string | undefined> {
    const cacheKey = `jwks:${kid}`
    const cached = await this.cache.get<string>(cacheKey)
    if (cached) return cached

    this.logger.log(`Unknown kid "${kid}", refreshing JWKS`)
    const jwks = await this.client.fetchJwks()
    if (!jwks) return undefined

    const kids: string[] = []
    for (const key of jwks.keys) {
      if (key.use !== 'sig' || key.kty !== 'RSA') continue
      const publicKey = buildRsaPublicKey(key.n, key.e)
      await this.cache.set(`jwks:${key.kid}`, publicKey, this.config.keycloakJwksCacheTtlMs)
      kids.push(key.kid)
    }

    await this.cache.set('jwks:kids', kids, this.config.keycloakJwksCacheTtlMs)
    return this.cache.get<string>(cacheKey)
  }

  getAudience(): string {
    if (!this.config.keycloakClientId) {
      throw new Error('Missing Keycloak client id')
    }
    return this.config.keycloakClientId
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

function buildRsaPublicKey(n: string, e: string): string {
  const key = createPublicKey({
    key: { kty: 'RSA', n, e },
    format: 'jwk',
  })
  return key.export({ format: 'pem', type: 'pkcs1' }) as string
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
