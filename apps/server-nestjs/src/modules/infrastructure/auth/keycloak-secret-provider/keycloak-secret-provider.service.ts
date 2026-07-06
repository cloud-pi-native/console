import type { Cache } from 'cache-manager'
import { createPublicKey } from 'node:crypto'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { JwtSecretRequestType } from '@nestjs/jwt'
import { z } from 'zod'
import { ConfigurationService } from '../../configuration/configuration.service'
import { createKeycloakSecretProviderOpenIdConfigurationCacheKey, createKeycloakSecretProviderPublicKeyCacheKey } from './keycloak-secret-provider.utils'

const OpenidConfigurationSchema = z.object({
  issuer: z.string().url(),
  jwks_uri: z.string().url(),
})

type OpenidConfiguration = z.infer<typeof OpenidConfigurationSchema>

const JwksResponseSchema = z.object({
  keys: z.array(z.object({
    kid: z.string(),
    kty: z.string(),
    use: z.string(),
    n: z.string(),
    e: z.string(),
  })),
})

type JwksResponse = z.infer<typeof JwksResponseSchema>

const JwtHeaderSchema = z.object({
  kid: z.string(),
})

@Injectable()
export class KeycloakSecretProviderService {
  private readonly logger = new Logger(KeycloakSecretProviderService.name)

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async fetchOpenIdConfig(): Promise<OpenidConfiguration | undefined> {
    const cacheKey = createKeycloakSecretProviderOpenIdConfigurationCacheKey(this.config.getKeycloakOpenidConfigurationUrl())
    const cached = await this.cache.get<OpenidConfiguration>(cacheKey)
    if (cached) return cached

    const response = await fetch(this.config.getKeycloakOpenidConfigurationUrl())
    if (!response.ok) {
      this.logger.error(`Failed to fetch openid-configuration: ${response.status} ${response.statusText}`)
      return undefined
    }

    const raw = await response.json()
    const config = OpenidConfigurationSchema.safeParse(raw)
    if (!config.success) {
      this.logger.error('openid-configuration response missing jwks_uri')
      return undefined
    }

    await this.cache.set(cacheKey, config.data, this.config.keycloakOpenidConfigurationCacheTtlMs)
    return config.data
  }

  async fetchIssuer(): Promise<string | undefined> {
    const config = await this.fetchOpenIdConfig()
    return config?.issuer
  }

  async fetchJwksUri(): Promise<string | undefined> {
    const config = await this.fetchOpenIdConfig()
    return config ? this.replaceJwksUriDomainWithInternalDomain(config.jwks_uri) : undefined
  }

  private replaceJwksUriDomainWithInternalDomain(jwksUri: string): string {
    if (!this.config.keycloakDomain) {
      this.logger.log(`No internal domain configured, returning original JWKS URI: ${jwksUri}`)
      return jwksUri
    }
    const url = new URL(jwksUri)
    url.protocol = this.config.keycloakProtocol ?? url.protocol
    url.host = this.config.keycloakDomain ?? url.host
    this.logger.log(`Replacing JWKS URI domain: ${jwksUri} -> ${url.toString()}`)
    return url.toString()
  }

  async fetchSigningKeys(): Promise<JwksResponse | undefined> {
    const jwksUri = await this.fetchJwksUri()
    if (!jwksUri) return undefined

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.keycloakJwksTimeoutMs)

    try {
      const response = await fetch(jwksUri, { signal: controller.signal })
      if (!response.ok) {
        this.logger.error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`)
        return undefined
      }

      const raw = await response.json()
      return JwksResponseSchema.parse(raw)
    } catch (error) {
      this.logger.error(`Failed to fetch JWKS: ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    } finally {
      clearTimeout(timeout)
    }
  }

  async fetchPublicKey(kid: string): Promise<string | undefined> {
    const cacheKey = createKeycloakSecretProviderPublicKeyCacheKey(kid)
    const cached = await this.cache.get<string>(cacheKey)
    if (cached) return cached

    const jwks = await this.fetchSigningKeys()
    if (!jwks) return undefined

    const key = jwks.keys.find(candidate => candidate.kid === kid && candidate.use === 'sig' && candidate.kty === 'RSA')
    if (!key) return undefined

    const publicKey = createPublicKey({
      key: { kty: 'RSA', n: key.n, e: key.e },
      format: 'jwk',
    })

    const pem = publicKey.export({ format: 'pem', type: 'pkcs1' }) as string
    await this.cache.set(cacheKey, pem, this.config.keycloakJwksCacheTtlMs)
    return pem
  }

  async getSecret(
    requestType: JwtSecretRequestType,
    tokenOrPayload: string | object | Buffer<ArrayBufferLike>,
  ): Promise<string> {
    if (requestType === JwtSecretRequestType.SIGN) {
      throw new TypeError('Signing is not supported')
    }

    if (typeof tokenOrPayload !== 'string') {
      throw new TypeError('Unsupported token type')
    }

    const parts = tokenOrPayload.split('.')
    if (parts.length !== 3) {
      throw new TypeError('Invalid JWT format')
    }

    const rawHeader = JSON.parse(
      Buffer.from(parts[0].replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString(),
    )
    const header = JwtHeaderSchema.safeParse(rawHeader)
    if (!header.success) {
      throw new TypeError('Missing kid')
    }
    const { kid } = header.data

    const publicKey = await this.fetchPublicKey(kid)
    if (!publicKey) {
      throw new Error('Unknown signing key')
    }

    return publicKey
  }
}
