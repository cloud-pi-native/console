import { createConfigurableModule } from '../configurable-feature-module'

export interface KeycloakConfig {
  protocol: string
  domain?: string
  publicProtocol: string
  publicDomain?: string
  realm?: string
  clientId?: string
  clientSecret?: string
  admin?: string
  adminPassword?: string
  adminClientId: string
  redirectUri?: string
  jwksCacheTtlMs: number
  jwksTimeoutMs: number
  openidConfigurationCacheTtlMs: number
  adminKcUserId: string[]
  url?: string
  realmUrl?: string
  openidConfigurationUrl?: string
}

export interface KeycloakModuleOptions extends KeycloakConfig {}

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = createConfigurableModule<KeycloakModuleOptions>('keycloak')

export { ConfigurableModuleClass }
export { MODULE_OPTIONS_TOKEN as KEYCLOAK_CONFIG }
