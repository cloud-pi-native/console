import type { KeycloakConfig } from './keycloak'

export type { ArgoCDConfig } from './argocd'
export type { BaseConfig } from './base'
export type { GitlabConfig } from './gitlab'
export type { HarborConfig } from './harbor'
export type { KeycloakConfig } from './keycloak'
export type { NexusConfig } from './nexus'
export type { OpenCdsConfig } from './opencds'
export type { SonarqubeConfig } from './sonarqube'
export type { VaultConfig } from './vault'

export function getKeycloakUrl(config: Pick<KeycloakConfig, 'KEYCLOAK_PROTOCOL' | 'KEYCLOAK_DOMAIN'>): string {
  if (!config.KEYCLOAK_PROTOCOL || !config.KEYCLOAK_DOMAIN) {
    throw new Error('Keycloak protocol or domain is not configured.')
  }
  return `${config.KEYCLOAK_PROTOCOL}://${config.KEYCLOAK_DOMAIN}`
}

export function getKeycloakRealmUrl(config: Pick<KeycloakConfig, 'KEYCLOAK_PROTOCOL' | 'KEYCLOAK_DOMAIN' | 'KEYCLOAK_REALM'>): string {
  return `${getKeycloakUrl(config)}/realms/${config.KEYCLOAK_REALM}`
}

export function getKeycloakOpenidConfigurationUrl(
  config: Pick<KeycloakConfig, 'KEYCLOAK_PROTOCOL' | 'KEYCLOAK_DOMAIN' | 'KEYCLOAK_REALM'>,
): string {
  return `${getKeycloakRealmUrl(config)}/.well-known/openid-configuration`
}

export function getInternalOrPublicUrl(
  name: string,
  publicUrl: string | undefined,
  internalUrl: string | undefined,
): string | undefined {
  const trimmedInternalUrl = internalUrl?.trim()
  const trimmedPublicUrl = publicUrl?.trim()
  return trimmedInternalUrl || trimmedPublicUrl || undefined
}

export function getInternalOrPublicGitlabUrl(publicUrl: string | undefined, internalUrl: string | undefined): string | undefined {
  return getInternalOrPublicUrl('GitLab', publicUrl, internalUrl)
}

export function getInternalOrPublicVaultUrl(publicUrl: string | undefined, internalUrl: string | undefined): string | undefined {
  return getInternalOrPublicUrl('Vault', publicUrl, internalUrl)
}

export function getInternalOrPublicHarborUrl(publicUrl: string | undefined, internalUrl: string | undefined): string | undefined {
  return getInternalOrPublicUrl('Harbor', publicUrl, internalUrl)
}

export function getInternalOrPublicNexusUrl(publicUrl: string | undefined, internalUrl: string | undefined): string | undefined {
  return getInternalOrPublicUrl('Nexus', publicUrl, internalUrl)
}

export function getInternalOrPublicSonarqubeUrl(publicUrl: string | undefined, internalUrl: string | undefined): string | undefined {
  return getInternalOrPublicUrl('SonarQube', publicUrl, internalUrl)
}
