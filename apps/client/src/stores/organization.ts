import type {
  CreateOrganizationBody,
  Organization,
  organizationContract,
  UpdateOrganizationBody,
} from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'
import {
  resourceListToDict,
} from '@cpn-console/shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[]>([])
  const organizationsById = computed(() => resourceListToDict(organizations.value))

  const listOrganizations = async (query?: typeof organizationContract.listOrganizations.query._type) => {
    organizations.value = await apiClient.Organizations.listOrganizations({ query })
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

  const syncOrganizations = () =>
    apiClient.Organizations.syncOrganizations()
      .then(response => extractData(response, 200))

  return {
    organizations,
    organizationsById,
    listOrganizations,
    createOrganization,
    updateOrganization,
    syncOrganizations,
  }
})
