import { getKeycloak, getUserProfile, keycloakLogin, keycloakLogout } from '@/utils/keycloak/keycloak.js'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminRole, User, UserProfile } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { useAdminRoleStore } from './admin-role.js'

export const useUserStore = defineStore('user', () => {
  const adminRoleStore = useAdminRoleStore()
  const isLoggedIn = ref<boolean>()
  const userProfile = ref<UserProfile>()
  const apiAuthInfos = ref<User>()

  const adminPerms = computed(() => {
    return apiAuthInfos.value
    ? myAdminRoles.value
    .reduce((acc, curr) => acc | BigInt(curr.permissions), 0n)
      : null
})
  const myAdminRoles = computed<AdminRole[]>(() => adminRoleStore.roles
    .filter(adminRole => apiAuthInfos.value?.adminRoleIds.includes(adminRole.id)))

  const setIsLoggedIn = () => {
    const keycloak = getKeycloak()
    isLoggedIn.value = keycloak.authenticated
    if (isLoggedIn.value) {
      setUserProfile()
    }
  }

  const setUserProfile = () => {
    userProfile.value = getUserProfile()
    adminRoleStore.listRoles()
    apiClient.Users.auth()
      .then(res => apiAuthInfos.value = extractData(res, 200))
  }

  const login = () => keycloakLogin()

  const logout = () => keycloakLogout()

  return {
    isLoggedIn,
    setIsLoggedIn,
    userProfile,
    apiAuthInfos,
    myAdminRoles,
    adminPerms,
    setUserProfile,
    login,
    logout,
  }
})
