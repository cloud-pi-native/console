import Keycloak from 'keycloak-js'
import { ssoConf } from './config-sso.js'
import { useUserStore } from '@/stores/user.js'

let keycloak

export const getKeycloak = () => {
  if (!keycloak) {
    keycloak = new Keycloak(ssoConf)
  }
  return keycloak
}

export const keycloakInit = async () => {
  try {
    const { onLoad, redirectUri, flow } = ssoConf
    const keycloak = getKeycloak()
    console.log('INIT1', { keycloak })
    await keycloak.init({ onLoad, flow, redirectUri })
    console.log('INIT2', { keycloak })
  } catch (error) {
    console.log(error)
  }
  const userStore = useUserStore()
  userStore.setIsLoggedIn(keycloak.authenticated)
}

export const keycloakLogin = async () => {
  try {
    const keycloak = getKeycloak()
    console.log('LOGIN1', { keycloak })
    await keycloak.login()
    console.log('LOGIN2', { keycloak })
  } catch (error) {
    console.log(error)
  }
}

export const keycloakLogout = async () => {
  try {
    const { redirectUri } = ssoConf
    const keycloak = getKeycloak()
    console.log('LOGOUT1', { keycloak })
    await keycloak.logout({ redirectUri })
    console.log('LOGOUT2', { keycloak })
  } catch (error) {
    console.log(error)
  }
}
