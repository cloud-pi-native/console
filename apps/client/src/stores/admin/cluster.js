import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { ref } from 'vue'

export const useAdminClusterStore = defineStore('admin-cluster', () => {
  const clusters = ref([])
  const selectedCluster = ref(undefined)

  const getAllClusters = async () => {
    clusters.value = [
      {
        id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
        name: 'cluster1',
        server: 'https://cluster1.com:6443',
        secretName: 'jey7db28-f9ea-46d4-ad16-607c7f1aa8b6',
        projects: [
          'beta-app',
        ],
        config: JSON.stringify({
          bearerToken: '<authentication token>',
          tlsClientConfig: {
            insecure: false,
            caData: '<base64 encoded certificate>',
          },
        }),
        clusterResources: true,
      },
    ]
    // return api.getAllClusters()
  }

  const addCluster = async ({ name, server, secretName, projects, config, clusterResources }) => {
    return api.addCluster({ name, server, secretName, projects, config, clusterResources })
  }

  const updateCluster = async ({ id, name, server, secretName, projects, config, clusterResources }) => {
    return api.updateCluster(id, { name, server, secretName, projects, config, clusterResources })
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
