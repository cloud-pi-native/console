import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateOrganizationSchema,
  GetOrganizationsSchema,
  UpdateOrganizationSchema,
} from '../schemas/index.js'

export const organizationContract = contractInstance.router({
  getOrganizations: {
    method: 'GET',
    path: `${apiPrefix}/organizations`,
    summary: 'Get organizations',
    description: 'Retrieved all active organizations.',
    responses: GetOrganizationsSchema.responses,
  },
})

export const organizationAdminContract = contractInstance.router({
  getAllOrganizations: {
    method: 'GET',
    path: `${apiPrefix}/admin/organizations`,
    summary: 'Get organizations',
    description: 'Retrieved all organizations.',
    responses: GetOrganizationsSchema.responses,
  },

  createOrganization: {
    method: 'POST',
    path: `${apiPrefix}/admin/organizations`,
    contentType: 'application/json',
    summary: 'Create organization',
    description: 'Create new organization.',
    body: CreateOrganizationSchema.body,
    responses: CreateOrganizationSchema.responses,
  },

  updateOrganization: {
    method: 'PUT',
    path: `${apiPrefix}/admin/organizations/:organizationName`,
    summary: 'Update organization',
    description: 'Update an organization by its name.',
    pathParams: UpdateOrganizationSchema.params,
    body: UpdateOrganizationSchema.body,
    responses: UpdateOrganizationSchema.responses,
  },

  syncOrganizations: {
    method: 'GET',
    path: `${apiPrefix}/admin/organizations/sync`,
    summary: 'Sync organizations',
    description: 'Synchronize organizations from external datasource using plugins.',
    responses: GetOrganizationsSchema.responses,
  },
})
