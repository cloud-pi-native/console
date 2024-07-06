import { defineStore } from 'pinia'
import {
  type Organization,
  type CreateOrganizationBody,
  type UpdateOrganizationBody,
  resourceListToDict,
} from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[]>([])
  const organizationsById = computed(() => resourceListToDict(organizations.value))

  const listOrganizations = async () => {
    organizations.value = await apiClient.Organizations.listOrganizations()
      .then(response => extractData(response, 200))
    return organizations.value
  }

  const createOrganization = (organization: CreateOrganizationBody) =>
    apiClient.Organizations.createOrganization({ body: { ...organization, source: 'dso-console' } })
      .then(response => extractData(response, 201))

  const updateOrganization = (organization: UpdateOrganizationBody & { name: Organization['name'] }) =>
    apiClient.Organizations.updateOrganization({
      body: { ...organization, source: 'dso-console' },
      params: { organizationName: organization.name },
    })
      .then(response => extractData(response, 200))

  const fetchOrganizations = () =>
    apiClient.Organizations.syncOrganizations()
      .then(response => extractData(response, 200))

  return {
    organizations,
    organizationsById,
    listOrganizations,
    createOrganization,
    updateOrganization,
    fetchOrganizations,
  }
})
