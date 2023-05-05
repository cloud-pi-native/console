import { getKeycloak, getUserProfile, keycloakLogin, keycloakLogout } from '@/utils/keycloak/keycloak.js'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(undefined)
  const isAdmin = ref(undefined)

  const userProfile = ref({})

  /**
   * @param {boolean} isLoggedIn
   */
  const setIsLoggedIn = () => {
    const keycloak = getKeycloak()
    isLoggedIn.value = keycloak.authenticated
    if (isLoggedIn.value) {
      isAdmin.value = userProfile.value.groups?.includes('admin')
    }
  }

  const setUserProfile = async () => {
    userProfile.value = await getUserProfile()
  }

  const login = async () => {
    await keycloakLogin()
  }

  const logout = async () => {
    await keycloakLogout()
  }

  return {
    isLoggedIn,
    isAdmin,
    setIsLoggedIn,
    userProfile,
    setUserProfile,
    login,
    logout,
  }
})
