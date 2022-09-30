import Keycloak from 'keycloak-js'

const conf = {
  url: 'http://localhost:8090',
  realm: 'TEST',
  clientId: 'TEST',
  onLoad: 'login-required',
  redirectUri: 'http://localhost:8080/',
}
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
    return authenticated
  } catch (error) {
    // alert('failed to initialize')
    console.log(error)
    return false
  }
}
