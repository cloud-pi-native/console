import { registerAs } from '@nestjs/config'
import z from 'zod'

const keycloakFeatureSchema = z.object({
  KEYCLOAK_PROTOCOL: z.enum(['http', 'https']).default('https'),
  KEYCLOAK_DOMAIN: z.string().min(1),
  KEYCLOAK_REALM: z.string().min(1),
  KEYCLOAK_CLIENT_ID: z.string().min(1),
  KEYCLOAK_CLIENT_SECRET: z.string().min(1),
  KEYCLOAK_ADMIN: z.string().min(1),
  KEYCLOAK_ADMIN_PASSWORD: z.string().min(1),
  KEYCLOAK_ADMIN_CLIENT_ID: z.string().default('admin-cli'),
  KEYCLOAK_REDIRECT_URI: z.string().url(),
  KEYCLOAK_JWKS_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  KEYCLOAK_JWKS_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  ADMIN_KC_USER_ID: z.preprocess(
    value => (typeof value === 'string' ? value.split(',').map(part => part.trim()).filter(Boolean) : value),
    z.array(z.string()).default([]),
  ),
}).transform((raw) => {
  const keycloakUrl = `${raw.KEYCLOAK_PROTOCOL}://${raw.KEYCLOAK_DOMAIN}`
  const keycloakRealmUrl = `${keycloakUrl}/realms/${raw.KEYCLOAK_REALM}`
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
    openidConfigurationUrl: `${keycloakRealmUrl}/.well-known/openid-configuration`,
  }
})

export type KeycloakConfig = z.infer<typeof keycloakFeatureSchema>

export const keycloakConfigFactory = registerAs('keycloak', () => keycloakFeatureSchema.parse(process.env))
