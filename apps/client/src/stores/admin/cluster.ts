import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Cluster, CreateClusterBody, UpdateClusterBody } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useAdminClusterStore = defineStore('admin-cluster', () => {
  const clusters = ref<Array<Cluster>>([])

  const getClusters = async () => {
    clusters.value = await api.getAdminClusters()
  }

  const getClusterAssociatedEnvironments = async (clusterId: Cluster['id']) => {
    return api.getClusterAssociatedEnvironments(clusterId)
  }

  const addCluster = async (cluster: CreateClusterBody) => api.addCluster(cluster)

  const updateCluster = async (cluster: UpdateClusterBody & { id: Cluster['id'] }) => {
    const { id, ...updateClusterData } = cluster
    return api.updateCluster(id, updateClusterData)
  }

  const deleteCluster = async (clusterId: Cluster['id']) => api.deleteCluster(clusterId)

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
