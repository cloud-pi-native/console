import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/xhr-client.js'
import type { ClusterModel, ClusterParams, CreateClusterDto, UpdateClusterDto } from '@dso-console/shared'

export const useAdminClusterStore = defineStore('admin-cluster', () => {
  const clusters = ref<ClusterModel[]>([])

  const getClusters = async () => {
    // @ts-ignore
    clusters.value = (await apiClient.v1ClustersList()).data
    return clusters.value
  }

  const getClusterAssociatedEnvironments = async (clusterId: ClusterParams['clusterId']) => {
    return (await apiClient.v1AdminClustersEnvironmentsDetail(clusterId)).data
  }

  const addCluster = async (cluster: CreateClusterDto) => {
    return (await apiClient.v1AdminClustersCreate(cluster)).data
  }

  const updateCluster = async (cluster: UpdateClusterDto & { id: ClusterParams['clusterId'] }) => {
    const { id, ...updateClusterData } = cluster
    return (await apiClient.v1AdminClustersUpdate(id, updateClusterData)).data
  }

  const deleteCluster = async (clusterId: ClusterParams['clusterId']) => {
    return (await apiClient.v1AdminClustersDelete(clusterId)).data
  }

  return {
    clusters,
    getClusters,
    getClusterAssociatedEnvironments,
    addCluster,
    updateCluster,
    deleteCluster,
  }
})
