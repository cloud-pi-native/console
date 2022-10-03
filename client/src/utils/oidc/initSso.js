import Keycloak from 'keycloak-js'
import { ssoConf as conf } from './sso-config.js'

let keycloak
export const getKeycloak = () => {
  if (!keycloak) keycloak = new Keycloak(conf)
  return keycloak
}

export async function initKeycloak () {
  try {
    const { onLoad, redirectUri } = conf
    const kc = getKeycloak()
    const authenticated = await kc.init({ onLoad, redirectUri })
    // alert(authenticated ? 'authenticated' : 'not authenticated')
    kc.login()
    return authenticated
  } catch (error) {
    // alert('failed to initialize')
    console.log(error)
    return false
  }
}
