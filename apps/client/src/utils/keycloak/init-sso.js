import Keycloak from 'keycloak-js'
import { ssoConf as conf } from './config-sso.js'
import { useUserStore } from '@/stores/user.js'

let keycloak
export const getKeycloak = () => {
  if (!keycloak) keycloak = new Keycloak(conf)
  return keycloak
}

export async function initKeycloak (kc = getKeycloak()) {
  try {
    const { onLoad } = conf
    return await kc.init({ onLoad, flow: 'implicit' })
  } catch (error) {
    console.log(error)
    return false
  }
}

export async function logout () {
  console.log('logout 0')
  const kc = getKeycloak()
  console.log('logout 1')
  kc.clearToken()
  const token = kc.token
  console.log({ token })
  window.localStorage.setItem('token', token)
  const isLoggedIn = await kc.logout({ redirectUri: 'http://localhost:8080/' }).then((success) => {
    console.log('--> log: logout success ', success)
  }).catch((error) => {
    console.log('--> log: logout error ', error)
  })
  console.log({ isLoggedIn })
  const userStore = useUserStore()
  userStore.setLoggedIn(isLoggedIn)
  console.log('logout 2')
}
