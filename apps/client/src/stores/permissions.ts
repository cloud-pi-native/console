import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient, extractData } from '@/api/xhr-client.js'
import {
  type PermDetails,
  type ProjectPermsKeys,
  type AdminPermsKeys,
  projectPermsDetails as defaultProjectPermsDetails,
  adminPermsDetails as defaultAdminPermsDetails,
  PROJECT_PERMS as defaultProjectPerms,
  ADMIN_PERMS as defaultAdminPerms,
} from '@cpn-console/shared'

export const usePermissionsStore = defineStore('permissions', () => {
  const projectPermsDetails = ref<PermDetails<ProjectPermsKeys>>(defaultProjectPermsDetails)
  const adminPermsDetails = ref<PermDetails<AdminPermsKeys>>(defaultAdminPermsDetails)
  const projectPerms = ref<Record<string, bigint>>(defaultProjectPerms)
  const adminPerms = ref<Record<string, bigint>>(defaultAdminPerms)

  const fetchPermissions = async () => {
    const data = await apiClient.System.getConf().then(response => extractData(response, 200))
    // @ts-ignore
    projectPermsDetails.value = data.projectPermsDetails
    // @ts-ignore
    adminPermsDetails.value = data.adminPermsDetails

    // Parse BigInts
    projectPerms.value = Object.fromEntries(
      Object.entries(data.projectPerms).map(([k, v]) => [k, BigInt(v as string)]),
    )
    adminPerms.value = Object.fromEntries(
      Object.entries(data.adminPerms).map(([k, v]) => [k, BigInt(v as string)]),
    )
  }

  return {
    projectPermsDetails,
    adminPermsDetails,
    projectPerms,
    adminPerms,
    fetchPermissions,
  }
})
