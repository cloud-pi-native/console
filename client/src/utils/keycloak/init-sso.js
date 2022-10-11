import Keycloak from 'keycloak-js'
import { ssoConf as conf } from './sso-config.js'

let keycloak
export const getKeycloak = () => {
  if (!keycloak) keycloak = new Keycloak(conf)
  return keycloak
}

export async function initKeycloak () {
  try {
    const { onLoad } = conf
    const kc = getKeycloak()
    const authenticated = await kc.init({ onLoad })
    return authenticated
  } catch (error) {
    console.log(error)
    return false
  }
}
