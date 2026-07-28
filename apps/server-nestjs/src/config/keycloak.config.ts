import { registerAs } from '@nestjs/config'
import z from 'zod'
import { optionalUrl, optionalValue } from './config.utils'

const keycloakFeatureSchema = z.object({
  KEYCLOAK_PROTOCOL: z.enum(['http', 'https']).default('https'),
  KEYCLOAK_DOMAIN: optionalValue,
  KEYCLOAK_REALM: optionalValue,
  KEYCLOAK_CLIENT_ID: optionalValue,
  KEYCLOAK_CLIENT_SECRET: optionalValue,
  KEYCLOAK_ADMIN: optionalValue,
  KEYCLOAK_ADMIN_PASSWORD: optionalValue,
  KEYCLOAK_ADMIN_CLIENT_ID: z.string().default('admin-cli'),
  KEYCLOAK_REDIRECT_URI: optionalUrl,
  KEYCLOAK_JWKS_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  KEYCLOAK_JWKS_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  ADMIN_KC_USER_ID: z.preprocess(
    value => (typeof value === 'string' ? value.split(',').map(part => part.trim()).filter(Boolean) : value),
    z.array(z.string()).default([]),
  ),
}).transform((raw) => {
  const keycloakUrl = raw.KEYCLOAK_DOMAIN ? `${raw.KEYCLOAK_PROTOCOL}://${raw.KEYCLOAK_DOMAIN}` : undefined
  const keycloakRealmUrl = keycloakUrl && raw.KEYCLOAK_REALM ? `${keycloakUrl}/realms/${raw.KEYCLOAK_REALM}` : undefined
  return {
    protocol: raw.KEYCLOAK_PROTOCOL,
    domain: raw.KEYCLOAK_DOMAIN,
    realm: raw.KEYCLOAK_REALM,
    clientId: raw.KEYCLOAK_CLIENT_ID,
    clientSecret: raw.KEYCLOAK_CLIENT_SECRET,
    admin: raw.KEYCLOAK_ADMIN,
    adminPassword: raw.KEYCLOAK_ADMIN_PASSWORD,
    adminClientId: raw.KEYCLOAK_ADMIN_CLIENT_ID,
    redirectUri: raw.KEYCLOAK_REDIRECT_URI,
    jwksCacheTtlMs: raw.KEYCLOAK_JWKS_CACHE_TTL_MS,
    jwksTimeoutMs: raw.KEYCLOAK_JWKS_TIMEOUT_MS,
    openidConfigurationCacheTtlMs: raw.KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS,
    adminKcUserId: raw.ADMIN_KC_USER_ID,
    url: keycloakUrl,
    realmUrl: keycloakRealmUrl,
    openidConfigurationUrl: keycloakRealmUrl ? `${keycloakRealmUrl}/.well-known/openid-configuration` : undefined,
  }
})

export type KeycloakConfig = z.infer<typeof keycloakFeatureSchema>

export const keycloakConfigFactory = registerAs('keycloak', () => keycloakFeatureSchema.parse(process.env))
