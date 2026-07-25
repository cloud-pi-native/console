import { registerAs } from '@nestjs/config'
import z from 'zod'
import { flag, nonEmpty, truthySchema } from './config.utils'

const keycloakRawSchema = z.object({
  USE_KEYCLOAK: flag(truthySchema.default('true')),
  KEYCLOAK_PROTOCOL: z.string().default('https'),
  KEYCLOAK_DOMAIN: nonEmpty(z.string()),
  KEYCLOAK_PUBLIC_PROTOCOL: z.string().default('https'),
  KEYCLOAK_PUBLIC_DOMAIN: nonEmpty(z.string()),
  KEYCLOAK_REALM: nonEmpty(z.string()),
  KEYCLOAK_CLIENT_ID: nonEmpty(z.string()),
  KEYCLOAK_CLIENT_SECRET: nonEmpty(z.string()),
  KEYCLOAK_ADMIN: nonEmpty(z.string()),
  KEYCLOAK_ADMIN_PASSWORD: nonEmpty(z.string()),
  KEYCLOAK_ADMIN_CLIENT_ID: z.string().default('admin-cli'),
  KEYCLOAK_REDIRECT_URI: nonEmpty(z.string().url()),
  KEYCLOAK_JWKS_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  KEYCLOAK_JWKS_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  KEYCLOAK_OPENID_CONFIGURATION_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  ADMIN_KC_USER_ID: z.preprocess(
    value => (typeof value === 'string' ? value.split(',').map(part => part.trim()).filter(Boolean) : value),
    z.array(z.string()).default([]),
  ),
})

function mapKeycloakConfig(raw: z.infer<typeof keycloakRawSchema>) {
  const keycloakUrl = `${raw.KEYCLOAK_PROTOCOL}://${raw.KEYCLOAK_DOMAIN}`
  const keycloakRealmUrl = `${keycloakUrl}/realms/${raw.KEYCLOAK_REALM}`
  return {
    enabled: raw.USE_KEYCLOAK,
    protocol: raw.KEYCLOAK_PROTOCOL,
    domain: raw.KEYCLOAK_DOMAIN,
    publicProtocol: raw.KEYCLOAK_PUBLIC_PROTOCOL,
    publicDomain: raw.KEYCLOAK_PUBLIC_DOMAIN,
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
}

const keycloakConfigSchema = keycloakRawSchema.transform(mapKeycloakConfig)

export const keycloakConfigFactory = registerAs('keycloak', () => keycloakConfigSchema.parse(process.env))
