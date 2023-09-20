import { defineStore } from 'pinia'
import { Ref, ref } from 'vue'
import api from '@/api/index.js'
import { OrganizationModel } from '@dso-console/shared'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations: Ref<Array<OrganizationModel>> = ref([])

  const setOrganizations = async () => {
    organizations.value = await api.getActiveOrganizations()
  }

  return {
    organizations,
    setOrganizations,
  }
})
