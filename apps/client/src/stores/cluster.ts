import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CleanedCluster } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useClusterStore = defineStore('cluster', () => {
  const clusters = ref<Array<CleanedCluster>>([])

  const getClusters = async () => {
    clusters.value = await apiClient.Clusters.listClusters()
      .then(response => extractData(response, 200))
    return clusters.value
  }

  return {
    clusters,
    getClusters,
  }
})
