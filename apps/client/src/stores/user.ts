import { getKeycloak, getUserProfile, keycloakLogin, keycloakLogout } from '@/utils/keycloak/keycloak'
import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import { adminGroupPath, type UserProfile } from '@dso-console/shared'

export const useUserStore = defineStore('user', () => {
  const isLoggedIn: Ref<boolean | undefined> = ref(undefined)
  const isAdmin: Ref<boolean | undefined> = ref(undefined)

  const userProfile: Ref<UserProfile | Record<string, never>> = ref({})

  const setIsLoggedIn = () => {
    const keycloak = getKeycloak()
    isLoggedIn.value = keycloak.authenticated
    if (isLoggedIn.value) {
      isAdmin.value = userProfile.value.groups?.includes(adminGroupPath)
    }
  }

  const setUserProfile = () => {
    userProfile.value = getUserProfile()
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