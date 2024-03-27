import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateClusterSchema,
  GetClustersSchema,
  GetClusterAssociatedEnvironmentsSchema,
  UpdateClusterSchema,
  DeleteClusterSchema,
} from '../schemas/index.js'

export const clusterContract = contractInstance.router({
  getClusters: {
    method: 'GET',
    path: `${apiPrefix}/clusters`,
    summary: 'Get clusters',
    description: 'Retrieved all clusters.',
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
