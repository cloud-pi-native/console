import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  type Organization,
  resourceListToDict,
} from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[]>([])
  const organizationsById = computed(() => resourceListToDict(organizations.value))

  const setOrganizations = async () => {
    organizations.value = await apiClient.Organizations.getOrganizations()
      .then(response => extractData(response, 200))
    return organizations.value
  }

  return {
    organizations,
    organizationsById,
    setOrganizations,
  }
})
