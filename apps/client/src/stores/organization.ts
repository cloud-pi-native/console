import { defineStore } from 'pinia'
import { ref } from 'vue'
import { resourceListToDict, type Organization, type ResourceById } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[]>([])
  let organizationsById: ResourceById<Organization> = {}

  const setOrganizations = async () => {
    const res = await api.getActiveOrganizations()
    organizations.value = res
    organizationsById = resourceListToDict(organizations.value)
  }

  return {
    organizations,
    organizationsById,
    setOrganizations,
  }
})
