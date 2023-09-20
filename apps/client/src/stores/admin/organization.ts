import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { type CreateOrganizationDto, type UpdateOrganizationDto } from '@dso-console/shared'

export const useAdminOrganizationStore = defineStore('admin-organization', () => {
  const getAllOrganizations = async () => {
    return api.getAllOrganizations()
  }

  const createOrganization = async (organization: CreateOrganizationDto['body']) => {
    return api.createOrganization({ ...organization, source: 'dso-console' })
  }

  const updateOrganization = async (organization: UpdateOrganizationDto['body']) => {
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
