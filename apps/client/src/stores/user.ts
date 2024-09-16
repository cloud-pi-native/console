import type { AdminRole, User, UserProfile } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { getKeycloak, getUserProfile, keycloakLogin, keycloakLogout } from '@/utils/keycloak/keycloak.js'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAdminRoleStore } from './admin-role.js'

export const useUserStore = defineStore('user', () => {
  const adminRoleStore = useAdminRoleStore()
  const isLoggedIn = ref<boolean>()
  const userProfile = ref<UserProfile>()
  const apiAuthInfos = ref<User>()

  const myAdminRoles = computed<AdminRole[]>(() => adminRoleStore.roles
    .filter(adminRole => apiAuthInfos.value?.adminRoleIds.includes(adminRole.id)))

  const adminPerms = computed(() => {
    return apiAuthInfos.value
      ? myAdminRoles.value
        .reduce((acc, curr) => acc | BigInt(curr.permissions), 0n)
      : null
  })

  const setUserProfile = async () => {
    userProfile.value = getUserProfile()
    adminRoleStore.listRoles()
    await apiClient.Users.auth()
      .then(res => apiAuthInfos.value = extractData(res, 200))
  }

  const setIsLoggedIn = async () => {
    const keycloak = getKeycloak()
    isLoggedIn.value = keycloak.authenticated
    if (isLoggedIn.value) {
      await setUserProfile()
    }
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
