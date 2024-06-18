import { defineStore } from 'pinia'
import {
  type Organization,
  type CreateOrganizationBody,
  type UpdateOrganizationBody,
  type UpdateOrganizationParams,
  resourceListToDict,
} from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useAdminOrganizationStore = defineStore('admin-organization', () => {
  const organizations = ref<Organization[]>([])
  const organizationsById = computed(() => resourceListToDict(organizations.value))

  const getAllOrganizations = async () => {
    organizations.value = await apiClient.OrganizationsAdmin.getAllOrganizations()
      .then(response => extractData(response, 200))
    return organizations.value
  }

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
    organizations,
    organizationsById,
    getAllOrganizations,
    createOrganization,
    updateOrganization,
    fetchOrganizations,
  }
})
