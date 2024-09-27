import type { ClientInferResponseBody } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CleanedClusterSchema,
  ClusterDetailsSchema,
  EnvironmentSchema,
  OrganizationSchema,
  UserSchema,
} from '../schemas/index.js'
import { CoerceBooleanSchema } from '../schemas/_utils.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const ClusterParams = z.object({
  clusterId: CleanedClusterSchema.shape.id,
})

export const clusterContract = contractInstance.router({
  listClusters: {
    method: 'GET',
    path: '',
    summary: 'Get clusters',
    description: 'Retrieve clusters authorized for user',
    responses: {
      200: z.array(CleanedClusterSchema),
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  createCluster: {
    method: 'POST',
    path: '',
    contentType: 'application/json',
    summary: 'Create cluster',
    description: 'Create new cluster.',
    body: ClusterDetailsSchema.omit({ id: true }),
    responses: {
      201: ClusterDetailsSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  getClusterDetails: {
    method: 'GET',
    path: `/:clusterId`,
    summary: 'Get cluster details',
    description: 'Retrieved details of a cluster.',
    pathParams: ClusterParams,
    responses: {
      200: ClusterDetailsSchema,
      401: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  getClusterEnvironments: {
    method: 'GET',
    path: `/:clusterId/environments`,
    summary: 'Get cluster envs',
    description: 'Retrieved environments linked to a cluster.',
    pathParams: ClusterParams,
    responses: {
      200: z.array(z.object({
        organization: OrganizationSchema.shape.name,
        // TODO: Remettre `ProjectSchemaV2.shape.name` mais attention aux projets non compatibles
        project: z.string(),
        name: EnvironmentSchema.shape.name,
        owner: UserSchema.shape.email.optional(),
      })),
      401: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateCluster: {
    method: 'PUT',
    path: `/:clusterId`,
    summary: 'Update cluster',
    description: 'Update a cluster by its ID.',
    pathParams: ClusterParams,
    body: ClusterDetailsSchema.omit({ id: true, label: true }).partial(),
    responses: {
      200: ClusterDetailsSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  deleteCluster: {
    method: 'DELETE',
    path: `/:clusterId`,
    summary: 'Delete cluster',
    description: 'Delete a cluster by its ID.',
    query: z.object({ force: CoerceBooleanSchema.optional() }),
    pathParams: ClusterParams,
    body: null,
    responses: {
      204: z.string()
        .nullable(),
      400: ErrorSchema,
      401: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/clusters`,
})

export type ClusterAssociatedEnvironments = ClientInferResponseBody<typeof clusterContract.getClusterEnvironments, 200>
export type CreateClusterBody = Zod.infer<typeof clusterContract.createCluster.body>
export type UpdateClusterBody = Zod.infer<typeof clusterContract.updateCluster.body>
