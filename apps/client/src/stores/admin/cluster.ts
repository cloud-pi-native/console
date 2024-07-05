import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Cluster, ClusterDetails, CreateClusterBody, UpdateClusterBody } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useAdminClusterStore = defineStore('admin-cluster', () => {
  const selectedCluster = ref<ClusterDetails>()

  const getClusterDetails = async (clusterId: Cluster['id']) => {
    selectedCluster.value = await apiClient.ClustersAdmin.getClusterDetails({ params: { clusterId } })
      .then(response => extractData(response, 200))
    return selectedCluster.value
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

  return {
    selectedCluster,
    getClusterAssociatedEnvironments,
    addCluster,
    updateCluster,
    deleteCluster,
    getClusterDetails,
  }
})
