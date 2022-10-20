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

export async function checkKeycloak () {
  try {
    const kc = getKeycloak()
    const authenticated = await kc.init({ onLoad: 'check-sso' })
    return { kc, authenticated }
  } catch (error) {
    console.log(error)
    return false
  }
}

export async function logout () {
  const { kc, authenticated } = await checkKeycloak()
  console.log('test ', { kc, authenticated })
  if (authenticated === true) {
    await kc.cleanToken()
  }

  console.log('test 1', { kc, authenticated })
}
