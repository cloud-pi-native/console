import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import api from '@/api/index.js'
import type { ClusterModel, ClusterParams, CreateClusterDto, UpdateClusterDto } from '@cpn-console/shared'

export const useAdminClusterStore = defineStore('admin-cluster', () => {
  const clusters: Ref<Array<ClusterModel | undefined>> = ref([])

  const getClusters = async () => {
    clusters.value = await api.getClusters()
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

  const getClusterById = async (clusterId: Required<ClusterModel['id']>) => {
    const cluster = clusters.value.find(c => c === clusterId)
    if (!cluster) {
      await getClusters()
      return clusters.value.find(c => c === clusterId)
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
