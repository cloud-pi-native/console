import Keycloak from 'keycloak-js'
import { ssoConf } from './config-sso.js'

let keycloak

export const getKeycloak = () => {
  if (!keycloak) {
    keycloak = new Keycloak(ssoConf)
  }
  return keycloak
}

export const getUserProfile = async () => {
  try {
    const keycloak = getKeycloak()
    const { email, id, firstName, lastName } = await keycloak.loadUserProfile()
    return {
      email,
      id,
      firstName,
      lastName,
    }
  } catch (error) {
    console.log(error)
  }
}

export const keycloakInit = async () => {
  try {
    const { onLoad, redirectUri, flow } = ssoConf
    const keycloak = getKeycloak()
    await keycloak.init({ onLoad, flow, redirectUri })
  } catch (error) {
    console.log(error)
  }
}

export const keycloakLogin = async () => {
  try {
    const keycloak = getKeycloak()
    await keycloak.login()
  } catch (error) {
    console.log(error)
  }
}

export const keycloakLogout = async () => {
  try {
    const { redirectUri } = ssoConf
    const keycloak = getKeycloak()
    await keycloak.logout({ redirectUri })
  } catch (error) {
    console.log(error)
  }
}
