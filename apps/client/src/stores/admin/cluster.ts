import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import api from '@/api/index.js'
import type { SensitiveClusterModel, CreateClusterDto, UpdateClusterDto, ClusterParams } from '@dso-console/shared'

export const useAdminClusterStore = defineStore('admin-cluster', () => {
  const clusters: Ref<Array<SensitiveClusterModel | undefined>> = ref([])

  const getAdminClusters = async () => {
    clusters.value = await api.getAdminClusters()
    return clusters.value
  }

  const getClusterAssociatedEnvironments = async (clusterId: ClusterParams['clusterId']) => {
    const res = await api.getClusterAssociatedEnvironments(clusterId)
    return res
  }

  const addCluster = async (cluster: CreateClusterDto) => {
    const res = await api.addCluster(cluster)
    return res
  }

  const updateCluster = async (cluster: UpdateClusterDto & { id: ClusterParams['clusterId'] }) => {
    const { id, ...updateClusterData } = cluster
    return api.updateCluster(id, updateClusterData)
  }

  const deleteCluster = async (clusterId: ClusterParams['clusterId']) => {
    return api.deleteCluster(clusterId)
  }

  return {
    clusters,
    getAdminClusters,
    getClusterAssociatedEnvironments,
    addCluster,
    updateCluster,
    deleteCluster,
  }
})
