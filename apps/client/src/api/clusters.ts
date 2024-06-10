import type { UpdateClusterBody, CreateClusterBody, Cluster } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const getClusters = () =>
  apiClient.Clusters.listClusters()
    .then(response => extractData(response, 200))

// Admin
export const getAdminClusters = () =>
  apiClient.ClustersAdmin.getClusters()
    .then(response => extractData(response, 200))

export const getClusterAssociatedEnvironments = (clusterId: Cluster['id']) =>
  apiClient.ClustersAdmin.getClusterEnvironments({ params: { clusterId } })
    .then(response => extractData(response, 200))

export const addCluster = (data: CreateClusterBody) =>
  apiClient.ClustersAdmin.createCluster({ body: data })
    .then(response => extractData(response, 201))

export const updateCluster = (clusterId: Cluster['id'], data: UpdateClusterBody) =>
  apiClient.ClustersAdmin.updateCluster({ body: data, params: { clusterId } })
    .then(response => extractData(response, 200))

export const deleteCluster = (clusterId: Cluster['id']) =>
  apiClient.ClustersAdmin.deleteCluster({ params: { clusterId } })
    .then(response => extractData(response, 204))
