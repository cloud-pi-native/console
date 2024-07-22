import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient, extractData } from '../api/xhr-client.js'
import { Role } from '@cpn-console/shared'

export const useAdminRoleStore = defineStore('adminRole', () => {
  const roles = ref<Role[]>([])

  const listAdminRoles = async () => {
    const res = await apiClient.AdminRoles.listAdminRoles()
      .then(response => extractData(response, 200))
    roles.value = res
    return res
  }

  return {
    roles,
    listAdminRoles,
  }
})
