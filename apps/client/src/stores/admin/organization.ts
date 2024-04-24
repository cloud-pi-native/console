import { defineStore } from 'pinia'
import api from '@/api/index.js'
import type { CreateOrganizationBody, UpdateOrganizationBody, UpdateOrganizationParams } from '@cpn-console/shared'

export const useAdminOrganizationStore = defineStore('admin-organization', () => {
  const getAllOrganizations = async () => {
    const res = await api.getAllOrganizations()
    return res ?? []
  }

  const createOrganization = async (organization: CreateOrganizationBody) => {
    return api.createOrganization({ ...organization, source: 'dso-console' })
  }

  const updateOrganization = async (organization: UpdateOrganizationBody & { name: UpdateOrganizationParams['organizationName'] }) => {
    return api.updateOrganization(organization.name, { ...organization, source: 'dso-console' })
  }

  const fetchOrganizations = async () => {
    return api.fetchOrganizations()
  }

  return {
    getAllOrganizations,
    createOrganization,
    updateOrganization,
    fetchOrganizations,
  }
})
