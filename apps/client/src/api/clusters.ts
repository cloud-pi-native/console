import type { UpdateClusterBody, CreateClusterBody, Cluster } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

export const getClusters = async () => {
  const response = await apiClient.Clusters.listClusters()
  if (response.status === 200) return response.body
  throw Error('Unable to fetch clusters')
}

// Admin
export const getAdminClusters = async () => {
  const response = await apiClient.ClustersAdmin.getClusters()
  if (response.status === 200) return response.body
}

export const getClusterAssociatedEnvironments = async (clusterId: Cluster['id']) => {
  const response = await apiClient.ClustersAdmin.getClusterEnvironments({ params: { clusterId } })
  if (response.status === 200) return response.body
}

export const addCluster = async (data: CreateClusterBody) => {
  const response = await apiClient.ClustersAdmin.createCluster({ body: data })
  if (response.status === 201) return response.body
}

export const updateCluster = async (clusterId: Cluster['id'], data: UpdateClusterBody) => {
  const response = await apiClient.ClustersAdmin.updateCluster({ body: data, params: { clusterId } })
  if (response.status === 200) return response.body
}

export const deleteCluster = async (clusterId: Cluster['id']) => {
  const response = await apiClient.ClustersAdmin.deleteCluster({ params: { clusterId } })
  if (response.status === 204) return response.body
}
