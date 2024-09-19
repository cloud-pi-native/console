import type { ClientInferResponseBody } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateClusterSchema,
  DeleteClusterSchema,
  GetClusterAssociatedEnvironmentsSchema,
  GetClusterDetailsSchema,
  GetClustersSchema,
  UpdateClusterSchema,
} from '../schemas/index.js'
import {
  CoerceBooleanSchema,
} from '../utils/schemas.js'

export const clusterContract = contractInstance.router({
  listClusters: {
    method: 'GET',
    path: `${apiPrefix}/clusters`,
    summary: 'Get clusters',
    description: 'Retrieve clusters authorized for user',
    responses: GetClustersSchema.responses,
  },

  createCluster: {
    method: 'POST',
    path: `${apiPrefix}/clusters`,
    contentType: 'application/json',
    summary: 'Create cluster',
    description: 'Create new cluster.',
    body: CreateClusterSchema.body,
    responses: CreateClusterSchema.responses,
  },

  getClusterDetails: {
    method: 'GET',
    path: `${apiPrefix}/clusters/:clusterId`,
    summary: 'Get cluster details',
    description: 'Retrieved details of a cluster.',
    pathParams: GetClusterDetailsSchema.params,
    responses: GetClusterDetailsSchema.responses,
  },

  getClusterEnvironments: {
    method: 'GET',
    path: `${apiPrefix}/clusters/:clusterId/environments`,
    summary: 'Get cluster envs',
    description: 'Retrieved environments linked to a cluster.',
    pathParams: GetClusterAssociatedEnvironmentsSchema.params,
    responses: GetClusterAssociatedEnvironmentsSchema.responses,
  },

  updateCluster: {
    method: 'PUT',
    path: `${apiPrefix}/clusters/:clusterId`,
    summary: 'Update cluster',
    description: 'Update a cluster by its ID.',
    pathParams: UpdateClusterSchema.params,
    body: UpdateClusterSchema.body,
    responses: UpdateClusterSchema.responses,
  },

  deleteCluster: {
    method: 'DELETE',
    path: `${apiPrefix}/clusters/:clusterId`,
    summary: 'Delete cluster',
    description: 'Delete a cluster by its ID.',
    query: z.object({ force: CoerceBooleanSchema.optional() }),
    pathParams: DeleteClusterSchema.params,
    body: null,
    responses: DeleteClusterSchema.responses,
  },
})

export type ClusterAssociatedEnvironments = ClientInferResponseBody<typeof clusterContract.getClusterEnvironments, 200>
