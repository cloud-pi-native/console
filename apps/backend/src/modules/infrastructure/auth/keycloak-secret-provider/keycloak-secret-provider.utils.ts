import { KEYCLOAK_SECRET_PROVIDER_OPENID_CONFIGURATION_CACHE_KEY, KEYCLOAK_SECRET_PROVIDER_PUBLIC_KEY_CACHE_PREFIX } from './keycloak-secret-provider.constants'

export function createKeycloakSecretProviderPublicKeyCacheKey(kid: string): string {
  return `${KEYCLOAK_SECRET_PROVIDER_PUBLIC_KEY_CACHE_PREFIX}${kid}`
}

export function createKeycloakSecretProviderOpenIdConfigurationCacheKey(url: string): string {
  return `${KEYCLOAK_SECRET_PROVIDER_OPENID_CONFIGURATION_CACHE_KEY}${url}`
}
