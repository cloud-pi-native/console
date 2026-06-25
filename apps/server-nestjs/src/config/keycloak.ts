import { Inject } from '@nestjs/common'
import { registerAs } from '@nestjs/config'
import z from 'zod'

const flagSchema = z
  .preprocess(val => (val === undefined ? 'false' : val), z.enum(['true', 'false', '']))
  .transform(val => val === 'true')
  .default(false)

const optionalUrl = (schema: z.ZodString) => schema.url().optional().or(z.literal('').transform(() => undefined))
const nonEmptyString = z.string().transform(value => value.trim() || undefined)

const keycloakFeatureSchema = z.object({
  USE_KEYCLOAK: flagSchema.default(true),
  KEYCLOAK_PROTOCOL: z.string().default('https'),
  KEYCLOAK_DOMAIN: nonEmptyString,
  KEYCLOAK_PUBLIC_PROTOCOL: z.string().default('https'),
  KEYCLOAK_PUBLIC_DOMAIN: nonEmptyString,
  KEYCLOAK_REALM: nonEmptyString,
  KEYCLOAK_CLIENT_ID: nonEmptyString,
  KEYCLOAK_CLIENT_SECRET: nonEmptyString,
  KEYCLOAK_ADMIN: nonEmptyString,
  KEYCLOAK_ADMIN_PASSWORD: nonEmptyString,
  KEYCLOAK_ADMIN_CLIENT_ID: z.string().default('admin-cli'),
  KEYCLOAK_REDIRECT_URI: optionalUrl(z.string()).optional(),
  KEYCLOAK_JWKS_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  KEYCLOAK_JWKS_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  ADMIN_KC_USER_ID: z.preprocess(
    value => (typeof value === 'string' ? value.split(',').map(part => part.trim()).filter(Boolean) : value),
    z.array(z.string()).default([]),
  ),
})

export type KeycloakRawConfig = z.infer<typeof keycloakFeatureSchema>

export interface KeycloakConfig {
  useKeycloak: boolean
  keycloakProtocol: string
  keycloakDomain: string | undefined
  keycloakPublicProtocol: string
  keycloakPublicDomain: string | undefined
  keycloakRealm: string | undefined
  keycloakClientId: string | undefined
  keycloakClientSecret: string | undefined
  keycloakAdmin: string | undefined
  keycloakAdminPassword: string | undefined
  keycloakAdminClientId: string
  keycloakRedirectUri: string | undefined
  keycloakJwksCacheTtlMs: number
  keycloakJwksTimeoutMs: number
  keycloakOpenidConfigurationCacheTtlMs: number
  adminKcUserId: string[]
  keycloakUrl: string
  keycloakRealmUrl: string
  keycloakOpenidConfigurationUrl: string
}

function toKeycloakConfig(raw: KeycloakRawConfig): KeycloakConfig {
  const keycloakUrl = `${raw.KEYCLOAK_PROTOCOL}://${raw.KEYCLOAK_DOMAIN}`
  const keycloakRealmUrl = `${keycloakUrl}/realms/${raw.KEYCLOAK_REALM}`
  return {
    useKeycloak: raw.USE_KEYCLOAK,
    keycloakProtocol: raw.KEYCLOAK_PROTOCOL,
    keycloakDomain: raw.KEYCLOAK_DOMAIN,
    keycloakPublicProtocol: raw.KEYCLOAK_PUBLIC_PROTOCOL,
    keycloakPublicDomain: raw.KEYCLOAK_PUBLIC_DOMAIN,
    keycloakRealm: raw.KEYCLOAK_REALM,
    keycloakClientId: raw.KEYCLOAK_CLIENT_ID,
    keycloakClientSecret: raw.KEYCLOAK_CLIENT_SECRET,
    keycloakAdmin: raw.KEYCLOAK_ADMIN,
    keycloakAdminPassword: raw.KEYCLOAK_ADMIN_PASSWORD,
    keycloakAdminClientId: raw.KEYCLOAK_ADMIN_CLIENT_ID,
    keycloakRedirectUri: raw.KEYCLOAK_REDIRECT_URI,
    keycloakJwksCacheTtlMs: raw.KEYCLOAK_JWKS_CACHE_TTL_MS,
    keycloakJwksTimeoutMs: raw.KEYCLOAK_JWKS_TIMEOUT_MS,
    keycloakOpenidConfigurationCacheTtlMs: raw.KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS,
    adminKcUserId: raw.ADMIN_KC_USER_ID,
    keycloakUrl,
    keycloakRealmUrl,
    keycloakOpenidConfigurationUrl: `${keycloakRealmUrl}/.well-known/openid-configuration`,
  }
}

export const KEY = 'keycloak' as const

export const keycloakConfigFactory = registerAs(KEY, () =>
  toKeycloakConfig(keycloakFeatureSchema.parse({
    USE_KEYCLOAK: process.env.USE_KEYCLOAK,
    KEYCLOAK_PROTOCOL: process.env.KEYCLOAK_PROTOCOL,
    KEYCLOAK_DOMAIN: process.env.KEYCLOAK_DOMAIN,
    KEYCLOAK_PUBLIC_PROTOCOL: process.env.KEYCLOAK_PUBLIC_PROTOCOL,
    KEYCLOAK_PUBLIC_DOMAIN: process.env.KEYCLOAK_PUBLIC_DOMAIN,
    KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
    KEYCLOAK_ADMIN: process.env.KEYCLOAK_ADMIN,
    KEYCLOAK_ADMIN_PASSWORD: process.env.KEYCLOAK_ADMIN_PASSWORD,
    KEYCLOAK_ADMIN_CLIENT_ID: process.env.KEYCLOAK_ADMIN_CLIENT_ID,
    KEYCLOAK_REDIRECT_URI: process.env.KEYCLOAK_REDIRECT_URI,
    KEYCLOAK_JWKS_CACHE_TTL_MS: process.env.KEYCLOAK_JWKS_CACHE_TTL_MS,
    KEYCLOAK_JWKS_TIMEOUT_MS: process.env.KEYCLOAK_JWKS_TIMEOUT_MS,
    KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS: process.env.KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS,
    ADMIN_KC_USER_ID: process.env.ADMIN_KC_USER_ID,
  })))

export const InjectKeycloakConfig = () => Inject(keycloakConfigFactory.KEY)

export default keycloakConfigFactory
