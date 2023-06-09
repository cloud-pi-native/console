import type { KeycloakInitOptions, KeycloakConfig } from 'keycloak-js'

import Keycloak from 'keycloak-js'

import {
  keycloakProtocol,
  keycloakDomain,
  keycloakClientId,
  keycloakRealm,
  keycloakRedirectUri,
} from '../env'

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

export const getUserProfile = async () => {
  try {
    const keycloak = getKeycloak()
    const { email, sub: id, given_name: firstName, family_name: lastName, groups } = keycloak.idTokenParsed as Record<string, string | string[]>
    return {
      email,
      id,
      firstName,
      lastName,
      groups,
    }
  } catch (error) {
    return error
  }
}

export const keycloakInit = async () => {
  keycloakInitOptions.redirectUri = keycloakInitOptions.redirectUri?.concat(location.pathname)
  try {
    const { onLoad, redirectUri, flow } = keycloakInitOptions
    const keycloak = getKeycloak()
    await keycloak.init({ onLoad, flow, redirectUri })
  } catch (error) {
    return error
  }
}

export const keycloakLogin = async () => {
  try {
    const keycloak = getKeycloak()
    await keycloak.login()
  } catch (error) {
    return error
  }
}

export const keycloakLogout = async () => {
  try {
    const keycloak = getKeycloak()
    await keycloak.logout()
  } catch (error) {
    return error
  }
}