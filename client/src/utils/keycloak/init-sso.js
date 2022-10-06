import Keycloak from 'keycloak-js'
import { ssoConf as conf } from './sso-config.js'

// WIP : il semblerait qu'au refresh d'une page, on perde la config keycloak
let keycloak
export const getKeycloak = () => {
  console.log({ 3: keycloak })
  if (!keycloak) keycloak = new Keycloak(conf)
  return keycloak
}

export async function initKeycloak () {
  try {
    const { onLoad, redirectUri } = conf
    const kc = getKeycloak()
    const authenticated = await kc.init({ onLoad, redirectUri })
    return authenticated
  } catch (error) {
    console.log(error)
    return false
  }
}
