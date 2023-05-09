import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref([])

  const setOrganizations = async () => {
    organizations.value = await api.getActiveOrganizations()
  }

  return {
    organizations,
    setOrganizations,
  }
})
