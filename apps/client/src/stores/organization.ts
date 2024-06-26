import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Organization } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[] | undefined>(undefined)

  const setOrganizations = async () => {
    organizations.value = await apiClient.Organizations.getOrganizations()
      .then(response => extractData(response, 200))
  }

  return {
    organizations,
    setOrganizations,
  }
})
