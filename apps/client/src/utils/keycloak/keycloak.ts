import type { KeycloakConfig, KeycloakInitOptions } from 'keycloak-js'
import Keycloak from 'keycloak-js'

import type { UserProfile } from '@cpn-console/shared'
import {
  keycloakClientId,
  keycloakDomain,
  keycloakProtocol,
  keycloakRealm,
  keycloakRedirectUri,
} from '../env.js'

export const keycloakInitOptions: KeycloakInitOptions = {
  onLoad: 'check-sso',
  flow: 'standard',
  redirectUri: keycloakRedirectUri,
}

export const keycloakConfig: KeycloakConfig = {
  url: `${keycloakProtocol}://${keycloakDomain}`,
  realm: keycloakRealm,
  clientId: keycloakClientId,
}

let keycloak: Keycloak

export function getKeycloak() {
  if (!keycloak) {
    keycloak = new Keycloak(keycloakConfig)
    keycloak.onAuthSuccess = () => {
      if (!(keycloak.refreshTokenParsed?.exp && keycloak.tokenParsed?.exp && keycloak.refreshTokenParsed.exp < keycloak.tokenParsed.exp)) {
        return
      }
      console.warn('Keycloak misconfiguration : refreshToken should not expire before token.')
      const refreshTokenDelay = (keycloak.tokenParsed.exp * 1000 - Date.now()) / 2
      setTimeout(() => {
        keycloak.updateToken()
      }, refreshTokenDelay)
    }
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30)
    }
  }
  return keycloak
}

export function getUserProfile(): UserProfile {
  try {
    const keycloak = getKeycloak()
    const { email, sub: id, given_name: firstName, family_name: lastName, groups } = keycloak.idTokenParsed as { email: string, sub: string, given_name: string, firstName: string, family_name: string, lastName: string, groups: string[] }
    return {
      email,
      id,
      firstName,
      lastName,
      groups,
    }
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message)
    throw new Error('échec de récupération du profil keycloak de l\'utilisateur')
  }
}

export async function keycloakInit() {
  keycloakInitOptions.redirectUri = keycloakInitOptions.redirectUri?.concat(location.pathname)
  try {
    const { onLoad, redirectUri, flow } = keycloakInitOptions
    const keycloak = getKeycloak()
    await keycloak.init({ onLoad, flow, redirectUri })
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message)
    throw new Error('échec d\'initialisation du keycloak')
  }
}

export async function keycloakLogin() {
  try {
    const keycloak = getKeycloak()
    await keycloak.login()
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message)
    throw new Error('échec de connexion au keycloak')
  }
}

export async function keycloakLogout() {
  try {
    const keycloak = getKeycloak()
    await keycloak.logout()
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message)
    throw new Error('échec de déconnexion du keycloak')
  }
}
