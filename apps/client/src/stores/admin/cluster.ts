import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Cluster, CreateClusterBody, UpdateClusterBody } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useAdminClusterStore = defineStore('admin-cluster', () => {
  const clusters = ref<Array<Cluster>>([])

  const getClusters = async () => {
    clusters.value = await apiClient.ClustersAdmin.getClusters()
      .then(response => extractData(response, 200))
  }

  const getClusterAssociatedEnvironments = (clusterId: Cluster['id']) =>
    apiClient.ClustersAdmin.getClusterEnvironments({ params: { clusterId } })
      .then(response => extractData(response, 200))

  const addCluster = (cluster: CreateClusterBody) =>
    apiClient.ClustersAdmin.createCluster({ body: cluster })
      .then(response => extractData(response, 201))

  const updateCluster = ({ id, ...body }: UpdateClusterBody & { id: Cluster['id'] }) =>
    apiClient.ClustersAdmin.updateCluster({ body, params: { clusterId: id } })
      .then(response => extractData(response, 200))

  const deleteCluster = (clusterId: Cluster['id']) =>
    apiClient.ClustersAdmin.deleteCluster({ params: { clusterId } })
      .then(response => extractData(response, 204))

  const getClusterById = async (clusterId: Required<Cluster['id']>) => {
    const cluster = clusters.value?.find(cluster => cluster?.id === clusterId)
    if (!cluster) {
      await getClusters()
      return clusters.value?.find(cluster => cluster?.id === clusterId)
    }
    return cluster
  }

  return {
    clusters,
    getClusters,
    getClusterAssociatedEnvironments,
    addCluster,
    updateCluster,
    deleteCluster,
    getClusterById,
  }
})
