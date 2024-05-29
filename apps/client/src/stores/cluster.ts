import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CleanedCluster } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useClusterStore = defineStore('cluster', () => {
  const clusters = ref<Array<CleanedCluster>>([])

  const getClusters = async () => {
    clusters.value = await api.getClusters()
  }

  return {
    clusters,
    getClusters,
  }
})
