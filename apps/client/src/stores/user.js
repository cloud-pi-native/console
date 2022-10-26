import { getKeycloak, keycloakInit } from '@/utils/keycloak/init-sso.js'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(undefined)

  /**
   * @param {boolean} isLoggedIn
   */
  const setIsLoggedIn = () => {
    const keycloak = getKeycloak()
    isLoggedIn.value = keycloak.authenticated
    console.log('users.js - authenticated: ', keycloak.authenticated)
  }

  const login = async () => {
    await keycloakInit()
    const kc = getKeycloak()
    const token = kc.token
    window.localStorage.setItem('token', token)
    setIsLoggedIn(kc.authenticated)
    console.log('authenticated: ', kc.authenticated)
  }

  return {
    isLoggedIn,
    setIsLoggedIn,
    login,
  }
})
