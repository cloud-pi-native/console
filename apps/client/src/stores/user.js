import { getKeycloak, initKeycloak } from '@/utils/keycloak/init-sso.js'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const loggedIn = ref(undefined)
  /**
   * @param {boolean} isLoggedIn
   */
  const setLoggedIn = (isLoggedIn) => {
    loggedIn.value = isLoggedIn
  }

  const login = async () => {
    await initKeycloak()
    const kc = getKeycloak()
    const token = kc.token
    window.localStorage.setItem('token', token)
    setLoggedIn(kc.authenticated)
    console.log('authenticated: ', kc.authenticated)
  }

  return { loggedIn, setLoggedIn, login }
})
