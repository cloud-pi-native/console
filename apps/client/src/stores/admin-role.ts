import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminRole, adminRoleContract } from '@cpn-console/shared'
import { AdminAuthorized } from '@cpn-console/shared'
import { apiClient, extractData } from '../api/xhr-client'
import { useUserStore } from './user'

export const useAdminRoleStore = defineStore('adminRole', () => {
  const userStore = useUserStore()
  const roles = ref<AdminRole []>([])
  const memberCounts = ref<Record<string, number>>({})

  const countMembersRoles = async () => {
    memberCounts.value = await apiClient.AdminRoles.adminRoleMemberCounts().then(res => extractData(res, 200))
    return memberCounts.value
  }

  const listRoles = async () => {
    roles.value = await apiClient.AdminRoles.listAdminRoles()
      .then(response => extractData(response, 200))
    if (AdminAuthorized.isAdmin(userStore.adminPerms)) {
      await countMembersRoles()
    }
    return roles.value
  }

  const createRole = async () => {
    roles.value = await apiClient.AdminRoles.createAdminRole({ body: { name: 'Nouveau rôle' } })
      .then(res => extractData(res, 201))
  }

  const deleteRole = async (roleId: AdminRole['id']) => {
    await apiClient.AdminRoles.deleteAdminRole({ params: { roleId } })
      .then(res => extractData(res, 204))
    await listRoles()
  }

  const patchRoles = async (body: typeof adminRoleContract.patchAdminRoles.body._type) => {
    roles.value = await apiClient.AdminRoles.patchAdminRoles({
      body,
    }).then(res => extractData(res, 200))
  }

  return {
    roles,
    memberCounts,
    countMembersRoles,
    listRoles,
    createRole,
    deleteRole,
    patchRoles,
  }
})
