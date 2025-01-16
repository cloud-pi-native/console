import { defineStore } from 'pinia'
import { ref } from 'vue'
import { resourceListToDict, type CleanedCluster, type Cluster, type CreateClusterBody, type UpdateClusterBody } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useClusterStore = defineStore('cluster', () => {
  const clusters = ref<Array<CleanedCluster>>([])
  const clustersById = computed(() => resourceListToDict(clusters.value))

  const getClusters = async () => {
    clusters.value = await apiClient.Clusters.listClusters()
      .then(response => extractData(response, 200))
    return clusters.value
  }

  const getClusterDetails = async (clusterId: Cluster['id']) =>
    apiClient.Clusters.getClusterDetails({ params: { clusterId } })
      .then(response => extractData(response, 200))

  const getClusterAssociatedEnvironments = (clusterId: Cluster['id']) =>
    apiClient.Clusters.getClusterEnvironments({ params: { clusterId } })
      .then(response => extractData(response, 200))

  const addCluster = (cluster: CreateClusterBody) =>
    apiClient.Clusters.createCluster({ body: cluster })
      .then(response => extractData(response, 201))

  const updateCluster = ({ id, ...body }: UpdateClusterBody & { id: Cluster['id'] }) =>
    apiClient.Clusters.updateCluster({ body, params: { clusterId: id } })
      .then(response => extractData(response, 200))

  const deleteCluster = (clusterId: Cluster['id']) =>
    apiClient.Clusters.deleteCluster({ params: { clusterId } })
      .then(response => extractData(response, 204))

  return {
    clusters,
    clustersById,
    getClusterAssociatedEnvironments,
    addCluster,
    updateCluster,
    deleteCluster,
    getClusterDetails,
    getClusters,
  }
})
