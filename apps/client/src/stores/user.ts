import { getKeycloak, getUserProfile, keycloakLogin, keycloakLogout } from '@/utils/keycloak/keycloak'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminGroupPath, type UserProfile } from '@cpn-console/shared'

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref<boolean>()
  const isAdmin = ref<boolean>()
  const userProfile = ref<UserProfile>()

  const setIsLoggedIn = () => {
    const keycloak = getKeycloak()
    isLoggedIn.value = keycloak.authenticated
    if (isLoggedIn.value) {
      setUserProfile()
    }
  }

  const setUserProfile = () => {
    userProfile.value = getUserProfile()
    isAdmin.value = userProfile.value?.groups?.includes(adminGroupPath)
  }

  const login = () => keycloakLogin()

  const logout = () => keycloakLogout()

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
