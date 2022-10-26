import { getKeycloak } from '@/utils/keycloak/init-sso.js'
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

  return {
    isLoggedIn,
    setIsLoggedIn,
  }
})
