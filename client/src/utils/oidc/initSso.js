import Keycloak from 'keycloak-js'

const conf = {
  url: 'http://localhost:8090',
  realm: 'TEST',
  clientId: 'TEST',
  onLoad: 'login-required',
}
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
    // alert(authenticated ? 'authenticated' : 'not authenticated')
    return authenticated
  } catch (error) {
    // alert('failed to initialize')
    console.log(error)
    return false
  }
}
