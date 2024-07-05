import { ClientInferResponseBody } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateClusterSchema,
  GetClustersSchema,
  GetClusterAssociatedEnvironmentsSchema,
  UpdateClusterSchema,
  DeleteClusterSchema,
  GetClusterDetailsSchema,
} from '../schemas/index.js'

export const clusterContract = contractInstance.router({
  listClusters: {
    method: 'GET',
    path: `${apiPrefix}/clusters`,
    summary: 'Get clusters',
    description: 'Retrieve clusters authorized for user',
    responses: GetClustersSchema.responses,
  },
})

export const clusterAdminContract = contractInstance.router({
  createCluster: {
    method: 'POST',
    path: `${apiPrefix}/admin/clusters`,
    contentType: 'application/json',
    summary: 'Create cluster',
    description: 'Create new cluster.',
    body: CreateClusterSchema.body,
    responses: CreateClusterSchema.responses,
  },

  getClusterEnvironments: {
    method: 'GET',
    path: `${apiPrefix}/admin/clusters/:clusterId/environments`,
    summary: 'Get cluster envs',
    description: 'Retrieved environments linked to a cluster.',
    pathParams: GetClusterAssociatedEnvironmentsSchema.params,
    responses: GetClusterAssociatedEnvironmentsSchema.responses,
  },

  getClusterDetails: {
    method: 'GET',
    path: `${apiPrefix}/admin/clusters/:clusterId`,
    summary: 'Get cluster details',
    description: 'Retrieved details of a cluster.',
    pathParams: GetClusterDetailsSchema.params,
    responses: GetClusterDetailsSchema.responses,
  },

  updateCluster: {
    method: 'PUT',
    path: `${apiPrefix}/admin/clusters/:clusterId`,
    summary: 'Update cluster',
    description: 'Update a cluster by its ID.',
    pathParams: UpdateClusterSchema.params,
    body: UpdateClusterSchema.body,
    responses: UpdateClusterSchema.responses,
  },

  deleteCluster: {
    method: 'DELETE',
    path: `${apiPrefix}/admin/clusters/:clusterId`,
    summary: 'Delete cluster',
    description: 'Delete a cluster by its ID.',
    pathParams: DeleteClusterSchema.params,
    body: null,
    responses: DeleteClusterSchema.responses,
  },
})

export type ClusterAssociatedEnvironments = ClientInferResponseBody<typeof clusterAdminContract.getClusterEnvironments, 200>
