import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Organization } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[] | undefined>(undefined)

  const setOrganizations = async () => {
    organizations.value = await api.getActiveOrganizations()
  }

  return {
    organizations,
    setOrganizations,
  }
})
