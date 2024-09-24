import type { ClientInferRequest } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import { OrganizationSchema } from '../schemas/index.js'
import { AtDatesToStringExtend } from '../schemas/_utils.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const organizationContract = contractInstance.router({
  listOrganizations: {
    method: 'GET',
    path: `${apiPrefix}/organizations`,
    summary: 'Get organizations',
    description: 'List organizations.',
    query: OrganizationSchema
      .omit({ id: true, createdAt: true, updatedAt: true })
      .partial(),
    responses: {
      200: OrganizationSchema
        .array(),
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  createOrganization: {
    method: 'POST',
    path: `${apiPrefix}/organizations`,
    contentType: 'application/json',
    summary: 'Create organization',
    description: 'Create new organization.',
    body: OrganizationSchema
      .pick({ name: true, label: true, source: true }),
    responses: {
      200: OrganizationSchema.extend(AtDatesToStringExtend),
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateOrganization: {
    method: 'PUT',
    path: `${apiPrefix}/organizations/:organizationName`,
    summary: 'Update organization',
    description: 'Update an organization by its name.',
    pathParams: z.object({
      organizationName: z.string(),
    }),
    body: OrganizationSchema
      .pick({ active: true, label: true, source: true })
      .partial(),
    responses: {
      200: OrganizationSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  syncOrganizations: {
    method: 'GET',
    path: `${apiPrefix}/organizations/sync`,
    summary: 'Sync organizations',
    description: 'Synchronize organizations from external datasource using plugins.',
    responses: {
      200: OrganizationSchema
        .array(),
      401: ErrorSchema,
      403: ErrorSchema,
      422: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
})

export type CreateOrganizationBody = ClientInferRequest<typeof organizationContract.createOrganization>['body']

export type UpdateOrganizationBody = ClientInferRequest<typeof organizationContract.updateOrganization>['body']

export type ListOrganizationQuery = ClientInferRequest<typeof organizationContract.listOrganizations>['query']
