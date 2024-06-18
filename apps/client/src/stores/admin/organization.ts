import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { Organization, ResourceById, type CreateOrganizationBody, type UpdateOrganizationBody, type UpdateOrganizationParams } from '@cpn-console/shared'

export const useAdminOrganizationStore = defineStore('admin-organization', () => {
  const organizations = ref<Organization[]>([])
  const organizationsById = computed<ResourceById<Organization>>(() => organizations.value.reduce((acc, curr) => {
    acc[curr.id] = curr
    return acc
  }, {} as ResourceById<Organization>))

  const getAllOrganizations = async () => {
    organizations.value = await api.getAllOrganizations()
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
    organizations,
    organizationsById,
    getAllOrganizations,
    createOrganization,
    updateOrganization,
    fetchOrganizations,
  }
})
