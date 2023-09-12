import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'

export const useAdminClusterStore = defineStore('admin-cluster', () => {
  const clusters = ref([])
  const selectedCluster = ref(undefined)

  const getAllClusters = async () => {
    clusters.value = await api.getAllClusters()
    return clusters.value
  }

  const addCluster = async ({ label, infos, cluster, user, projectsId, clusterResources, privacy }) => {
    const res = await api.addCluster({ label, infos, cluster, user, projectsId, clusterResources, privacy })
    return res
  }

  const updateCluster = async ({ id, cluster, user, projectsId, clusterResources, privacy }) => {
    return api.updateCluster(id, { cluster, user, projectsId, clusterResources, privacy })
  }

  // const removeCluster = async ({ name, label, active }) => {
  //   return api.removeCluster(name, { label, active, source: 'dso-console' })
  // }

  return {
    clusters,
    selectedCluster,
    getAllClusters,
    addCluster,
    updateCluster,
    // removeCluster,
  }
})
