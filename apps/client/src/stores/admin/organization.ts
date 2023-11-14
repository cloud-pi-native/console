import { defineStore } from 'pinia'
import api from '@/api/index.js'
import type { CreateOrganizationDto, UpdateOrganizationDto } from '@dso-console/shared'

export const useAdminOrganizationStore = defineStore('admin-organization', () => {
  const getAllOrganizations = async () => {
    return api.getAllOrganizations()
  }

  const createOrganization = async (organization: CreateOrganizationDto) => {
    return api.createOrganization({ ...organization, source: 'dso-console' })
  }

  const updateOrganization = async (organization: UpdateOrganizationDto & { name: CreateOrganizationDto['name'] }) => {
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
