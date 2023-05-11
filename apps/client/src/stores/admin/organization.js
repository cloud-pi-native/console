import { defineStore } from 'pinia'
import api from '@/api/index.js'

export const useAdminOrganizationStore = defineStore('admin-organization', () => {
  const getAllOrganizations = async () => {
    return api.getAllOrganizations()
  }

  const createOrganization = async ({ name, label }) => {
    return api.createOrganization({ name, label })
  }

  const updateOrganization = async ({ name, label, active }) => {
    return api.updateOrganization(name, { label, active })
  }

  return {
    getAllOrganizations,
    createOrganization,
    updateOrganization,
  }
})
