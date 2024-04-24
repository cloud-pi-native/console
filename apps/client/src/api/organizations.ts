import type { UpdateOrganizationBody, CreateOrganizationBody } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

export const getActiveOrganizations = async () => {
  const response = await apiClient.Organizations.getOrganizations()
  if (response.status === 200) return response.body
}

// Admin
export const getAllOrganizations = async () => {
  const response = await apiClient.OrganizationsAdmin.getAllOrganizations()
  if (response.status === 200) return response.body
}

export const createOrganization = async (data: CreateOrganizationBody) => {
  const response = await apiClient.OrganizationsAdmin.createOrganization({ body: data })
  if (response.status === 201) return response.body
}

export const updateOrganization = async (organizationName: CreateOrganizationBody['name'], data: UpdateOrganizationBody) => {
  const response = await apiClient.OrganizationsAdmin.updateOrganization({ body: data, params: { organizationName } })
  if (response.status === 200) return response.body
}

export const fetchOrganizations = async () => {
  const response = await apiClient.OrganizationsAdmin.syncOrganizations()
  if (response.status === 200) return response.body
}
