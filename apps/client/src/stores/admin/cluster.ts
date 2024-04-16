import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Cluster, CreateClusterBody, UpdateClusterBody } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useAdminClusterStore = defineStore('admin-cluster', () => {
  const clusters = ref<Cluster[]>([])

  const getClusters = async () => {
    clusters.value = await api.getClusters()
    return clusters.value
  }

  const getClusterAssociatedEnvironments = async (clusterId: Cluster['id']) => {
    const res = await api.getClusterAssociatedEnvironments(clusterId)
    return res
  }

  const addCluster = async (cluster: CreateClusterBody) => {
    const res = await api.addCluster(cluster)
    return res
  }

  const updateCluster = async (cluster: UpdateClusterBody & { id: Cluster['id'] }) => {
    const { id, ...updateClusterData } = cluster
    return api.updateCluster(id, updateClusterData)
  }

  const deleteCluster = async (clusterId: Cluster['id']) => {
    return api.deleteCluster(clusterId)
  }

  const getClusterById = async (clusterId: Required<Cluster['id']>) => {
    const cluster = clusters.value.find(cluster => cluster?.id === clusterId)
    if (!cluster) {
      await getClusters()
      return clusters.value.find(cluster => cluster?.id === clusterId)
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
