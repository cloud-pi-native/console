import type { UpdateOrganizationBody, CreateOrganizationBody } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const getActiveOrganizations = async () =>
  apiClient.Organizations.getOrganizations()
    .then(response => extractData(response, 200))

// Admin
export const getAllOrganizations = async () =>
  apiClient.OrganizationsAdmin.getAllOrganizations()
    .then(response => extractData(response, 200))

export const createOrganization = async (data: CreateOrganizationBody) =>
  apiClient.OrganizationsAdmin.createOrganization({ body: data })
    .then(response => extractData(response, 201))

export const updateOrganization = async (organizationName: CreateOrganizationBody['name'], data: UpdateOrganizationBody) =>
  apiClient.OrganizationsAdmin.updateOrganization({ body: data, params: { organizationName } })
    .then(response => extractData(response, 200))

export const fetchOrganizations = async () =>
  apiClient.OrganizationsAdmin.syncOrganizations()
    .then(response => extractData(response, 200))
