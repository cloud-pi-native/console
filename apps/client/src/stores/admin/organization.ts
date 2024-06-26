import { defineStore } from 'pinia'
import type { CreateOrganizationBody, UpdateOrganizationBody, UpdateOrganizationParams } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useAdminOrganizationStore = defineStore('admin-organization', () => {
  const getAllOrganizations = () =>
    apiClient.OrganizationsAdmin.getAllOrganizations()
      .then(response => extractData(response, 200))

  const createOrganization = (organization: CreateOrganizationBody) =>
    apiClient.OrganizationsAdmin.createOrganization({ body: { ...organization, source: 'dso-console' } })
      .then(response => extractData(response, 201))

  const updateOrganization = (organization: UpdateOrganizationBody & { name: UpdateOrganizationParams['organizationName'] }) =>
    apiClient.OrganizationsAdmin.updateOrganization({
      body: { ...organization, source: 'dso-console' },
      params: { organizationName: organization.name },
    })
      .then(response => extractData(response, 200))

  const fetchOrganizations = () =>
    apiClient.OrganizationsAdmin.syncOrganizations()
      .then(response => extractData(response, 200))

  return {
    getAllOrganizations,
    createOrganization,
    updateOrganization,
    fetchOrganizations,
  }
})
