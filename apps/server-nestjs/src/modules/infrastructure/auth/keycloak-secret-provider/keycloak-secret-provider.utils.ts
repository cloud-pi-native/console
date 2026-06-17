import { KEYCLOAK_SECRET_PROVIDER_PUBLIC_KEY_CACHE_PREFIX } from './keycloak-secret-provider.constant'

export function createKeycloakSecretProviderPublicKeyCacheKey(kid: string): string {
  return `${KEYCLOAK_SECRET_PROVIDER_PUBLIC_KEY_CACHE_PREFIX}${kid}`
}
