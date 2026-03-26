import type { Cache } from '@nestjs/cache-manager'
import { createPublicKey } from 'node:crypto'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { z } from 'zod'
import { ConfigurationService } from '../configuration/configuration.service'

export const API_USER = Symbol('API_USER')

const jwkSchema = z.object({
  kid: z.string(),
  kty: z.string(),
  use: z.string().optional(),
  alg: z.string().optional(),
  n: z.string().optional(),
  e: z.string().optional(),
  x5c: z.array(z.string()).optional(),
}).passthrough()

const rsaJwkSchema = jwkSchema.extend({
  kty: z.literal('RSA'),
  n: z.string(),
  e: z.string(),
})

const jwksSchema = z.object({
  keys: z.array(jwkSchema),
})

export type Jwks = z.infer<typeof jwksSchema>

const verifiedJwtPayloadSchema = z.record(z.unknown()).and(z.object({
  sub: z.string().optional(),
  exp: z.number().optional(),
  iat: z.number().optional(),
  jti: z.string().optional(),
  iss: z.string().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
}))

export type VerifiedJwtPayload = z.infer<typeof verifiedJwtPayloadSchema>

const maxAgeRegex = /max-age=(\d+)/

const jwtSchema = z.object({
  header: z.object({ kid: z.string() }).passthrough(),
  payload: z.object({ iss: z.string() }).passthrough(),
}).passthrough()

export type Jwt = z.infer<typeof jwtSchema>

@Injectable()
export class AuthService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  private async getJwksWithCache(issuer: string) {
    return await this.getJwksFromCache(issuer) ?? await this.getJwks(issuer)
  }

  private async getJwks(issuer: string): Promise<Jwks> {
    const response = await fetch(`${issuer}/protocol/openid-connect/certs`, {
      headers: { accept: 'application/json' },
    })

    if (!response.ok)
      throw new Error(`JWKS fetch failed: ${response.status}`)

    const jwks = jwksSchema.parse(await response.json())
    const cacheControl = response.headers.get('cache-control') ?? ''
    const match = cacheControl.match(maxAgeRegex)
    const maxAgeMs = match?.[1] ? Number.parseInt(match[1], 10) * 1000 : 60_000
    await this.setJwksInCache(issuer, jwks, maxAgeMs)
    return jwks
  }

  private async getJwksFromCache(issuer: string): Promise<Jwks | undefined> {
    const cached = await this.cache.get<unknown>(generateJwksCacheKey(issuer))
    const parsed = jwksSchema.safeParse(cached)
    return parsed.success ? parsed.data : undefined
  }

  private async setJwksInCache(issuer: string, jwks: Jwks, maxAgeMs: number) {
    await this.cache.set(generateJwksCacheKey(issuer), jwks, maxAgeMs)
  }

  private async getPublicKey(jwt: Jwt) {
    const { keys } = await this.getJwksWithCache(jwt.payload.iss)
    const candidateKey = keys.find(k => k.kid === jwt.header.kid)
    const parsed = rsaJwkSchema.safeParse(candidateKey)
    if (!parsed.success) {
      console.log('rsaJwkSchema parsing failed:', parsed.error)
      return null
    }
    return createPublicKey({ key: parsed.data, format: 'jwk' })
  }

  private decode(token: string): Jwt | null {
    const decoded = this.jwt.decode<unknown>(token, { complete: true })
    const parsed = jwtSchema.safeParse(decoded)
    return parsed.success ? parsed.data : null
  }

  async verifyToken(token: string): Promise<VerifiedJwtPayload | null> {
    try {
      const jwt = this.decode(token)
      if (!jwt) {
        console.log('decode returned null')
        return null
      }

      const publicKey = await this.getPublicKey(jwt)
      if (!publicKey) {
        console.log('getPublicKey returned null')
        return null
      }

      console.log('calling verifyAsync')
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        publicKey: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
        issuer: jwt.payload.iss,
        audience: this.config.keycloakClientId,
        algorithms: ['RS256'],
      })

      const parsed = verifiedJwtPayloadSchema.safeParse(payload)
      return parsed.success ? parsed.data : null
    } catch (e) {
      console.log('verifyToken failed:', e)
      return null
    }
  }
}

function generateJwksCacheKey(issuer: string) {
  return `jwks:${issuer}`
}
