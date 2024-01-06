import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import type { OrganizationModel } from '@dso-console/shared'
import { apiClient } from '@/api/xhr-client.js'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations: Ref<Array<OrganizationModel>> = ref([])

  const setOrganizations = async () => {
    organizations.value = (await apiClient.v1OrganizationsList()).data
  }

  return {
    organizations,
    setOrganizations,
  }
})
