import type { AdminRole, User, UserProfile } from '@cpn-console/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { getKeycloak, getUserProfile, keycloakLogin, keycloakLogout } from '@/utils/keycloak/keycloak.js'
import { useAdminRoleStore } from './admin-role.js'
import { useSystemSettingsStore } from './system-settings.js'

export const useUserStore = defineStore('user', () => {
  const adminRoleStore = useAdminRoleStore()
  const systemSettingsStore = useSystemSettingsStore()
  const isLoggedIn = ref<boolean>()
  const userProfile = ref<UserProfile>()
  const apiAuthInfos = ref<User>()

  const myAdminRoles = computed<AdminRole[]>(() => adminRoleStore.roles?.filter(adminRole => apiAuthInfos.value?.adminRoleIds.includes(adminRole.id)) ?? [])

  const adminPerms = computed(() => {
    if (!apiAuthInfos.value) return null
    const globalRoles = adminRoleStore.roles?.filter(role => role.type === 'global') ?? []
    const globalPerms = globalRoles.reduce((acc, role) => acc | BigInt(role.permissions), 0n)
    const adminPerms = myAdminRoles.value.reduce((acc, role) => acc | BigInt(role.permissions), 0n)
    return globalPerms | adminPerms
  })

  const setUserProfile = async () => {
    userProfile.value = getUserProfile()
    await systemSettingsStore.listSystemSettings().catch(() => undefined)
    await apiClient.Users.auth()
      .then((res: any) => apiAuthInfos.value = extractData(res, 200))
  }

  const setIsLoggedIn = async () => {
    const keycloak = getKeycloak()
    if (keycloak.authenticated !== isLoggedIn.value) {
      isLoggedIn.value = keycloak.authenticated
      if (isLoggedIn.value) {
        await setUserProfile()
      }
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
