import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminRole, User, UserProfile } from '@cpn-console/shared'
import { ADMIN_PERMS } from '@cpn-console/shared'
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
    let perms = myAdminRoles.value.reduce((acc, curr) => acc | BigInt(curr.permissions), 0n)
    const legacyDefaults = systemSettingsStore.systemSettingsByKey['legacy-permissions']
    if (legacyDefaults?.value === 'on') {
      perms |= ADMIN_PERMS.MANAGE_PROJECTS
    }
    return perms
  })

  const setUserProfile = async () => {
    userProfile.value = getUserProfile()
    await systemSettingsStore.listSystemSettings('legacy-permissions').catch(() => undefined)
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
