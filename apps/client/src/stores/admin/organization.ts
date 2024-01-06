import { defineStore } from 'pinia'
import { apiClient } from '@/api/xhr-client.js'
import type { CreateOrganizationDto, UpdateOrganizationDto } from '@dso-console/shared'

export const useAdminOrganizationStore = defineStore('admin-organization', () => {
  const getAllOrganizations = async () => {
    return (await apiClient.v1AdminOrganizationsList()).data
  }

  const createOrganization = async (organization: CreateOrganizationDto) => {
    return (await apiClient.v1AdminOrganizationsCreate({ ...organization, source: 'dso-console' })).data
  }

  const updateOrganization = async (organization: UpdateOrganizationDto & { name: CreateOrganizationDto['name'] }) => {
    return (await apiClient.v1AdminOrganizationsUpdate(organization.name, { ...organization, source: 'dso-console' })).data
  }

  const fetchOrganizations = async () => {
    return (await apiClient.v1AdminOrganizationsSyncUpdate()).data
  }

  return {
    getAllOrganizations,
    createOrganization,
    updateOrganization,
    fetchOrganizations,
  }
})
