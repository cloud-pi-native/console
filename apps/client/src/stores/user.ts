import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminRole, User, UserProfile } from '@cpn-console/shared'
import { getEffectiveAdminPermissions } from '@cpn-console/shared'
import { useAdminRoleStore } from './admin-role.js'
import { useSystemSettingsStore } from './system-settings.js'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { getKeycloak, getUserProfile, keycloakLogin, keycloakLogout } from '@/utils/keycloak/keycloak.js'

export const useUserStore = defineStore('user', () => {
  const adminRoleStore = useAdminRoleStore()
  const systemSettingsStore = useSystemSettingsStore()
  const isLoggedIn = ref<boolean>()
  const userProfile = ref<UserProfile>()
  const apiAuthInfos = ref<User>()

  const myAdminRoles = computed<AdminRole[]>(() => adminRoleStore.roles?.filter(adminRole => apiAuthInfos.value?.adminRoleIds.includes(adminRole.id)) ?? [])

  const adminPerms = computed(() => {
    if (!apiAuthInfos.value) return null
    const perms = myAdminRoles.value.reduce((acc, curr) => acc | BigInt(curr.permissions), 0n)
    const refinedRermissions = systemSettingsStore.systemSettingsByKey['refined-permissions']
    const refinedEnabled = refinedRermissions ? refinedRermissions.value === 'on' : false
    return getEffectiveAdminPermissions(perms, { refined: refinedEnabled })
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
