import { getKeycloak, getUserProfile, keycloakLogin, keycloakLogout } from '@/utils/keycloak/keycloak.js'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserProfile } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { useAdminRoleStore } from './admin-role.js'

export const useUserStore = defineStore('user', () => {
  const adminRoleStore = useAdminRoleStore()
  const isLoggedIn = ref<boolean>()
  const userProfile = ref<UserProfile>()
  const adminPerms = ref<bigint>()

  const setIsLoggedIn = () => {
    const keycloak = getKeycloak()
    isLoggedIn.value = keycloak.authenticated
    if (isLoggedIn.value) {
      setUserProfile()
    }
  }

  const setUserProfile = () => {
    userProfile.value = getUserProfile()
    apiClient.Users.auth().then((res) => {
      const authDetails = extractData(res, 200)
      adminRoleStore.listAdminRoles().then((adminRoles) => {
        adminPerms.value = adminRoles
          .filter(role => authDetails.adminRoleIds.includes(role.id))
          .reduce((acc, curr) => acc | BigInt(curr.permissions), 0n)
      })
    })
  }

  const login = () => keycloakLogin()

  const logout = () => keycloakLogout()

  return {
    isLoggedIn,
    setIsLoggedIn,
    userProfile,
    adminPerms,
    setUserProfile,
    login,
    logout,
  }
})
