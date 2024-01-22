import type { KeycloakInitOptions, KeycloakConfig } from 'keycloak-js'
import Keycloak from 'keycloak-js'

import {
  keycloakProtocol,
  keycloakDomain,
  keycloakClientId,
  keycloakRealm,
  keycloakRedirectUri,
} from '../env'
import { type UserProfile } from '@dso-console/shared'

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

export const getKeycloak = () => {
  if (!keycloak) {
    keycloak = new Keycloak(keycloakConfig)
  }
  return keycloak
}

export const getUserProfile = (): UserProfile => {
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

export const keycloakInit = async () => {
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

export const keycloakLogin = async () => {
  try {
    const keycloak = getKeycloak()
    await keycloak.login()
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message)
    throw new Error('échec de connexion au keycloak')
  }
}

export const keycloakLogout = async () => {
  try {
    const keycloak = getKeycloak()
    await keycloak.logout()
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message)
    throw new Error('échec de déconnexion du keycloak')
  }
}
