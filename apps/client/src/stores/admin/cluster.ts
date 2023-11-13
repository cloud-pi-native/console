import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import api from '@/api/index.js'
import type { ClusterModel, CreateClusterDto, UpdateClusterDto } from '@dso-console/shared'

export const useAdminClusterStore = defineStore('admin-cluster', () => {
  const clusters: Ref<Array<ClusterModel | undefined>> = ref([])

  const getClusters = async () => {
    clusters.value = await api.getClusters()
    return clusters.value
  }

  const getClusterAssociatedEnvironments = async (clusterId: string) => {
    const res = await api.getClusterAssociatedEnvironments(clusterId)
    return res
  }

  const addCluster = async (cluster: CreateClusterDto['body']) => {
    const res = await api.addCluster(cluster)
    return res
  }

  const updateCluster = async (cluster: UpdateClusterDto['body']) => {
    return api.updateCluster(cluster.id, cluster)
  }

  const deleteCluster = async (clusterId: string) => {
    return api.deleteCluster(clusterId)
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
