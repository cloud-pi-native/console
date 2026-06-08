import type { Cache } from 'cache-manager'
import type { UserContext } from '../auth.service'
import { createPublicKey } from 'node:crypto'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
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
  ) {}

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

  async validatePayload(payload: KeycloakPayload): Promise<UserContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    })
    if (!user) {
      throw new UnauthorizedException('Not authenticated')
    }

    const adminRoleIds = user.adminRoleIds ?? []
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

    const mergedRoleIds = [...new Set(activeAdminRoles.map(({ id }) => id))]
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { adminRoleIds: mergedRoleIds, lastLogin: new Date().toISOString() },
    })

    const adminPerms = activeAdminRoles.reduce((acc, curr) => acc | curr.permissions, 0n)

    return {
      userId: payload.sub,
      adminPermissions: adminPerms,
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
