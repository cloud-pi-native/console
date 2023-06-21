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
        label: 'cluster1',
        projectsId: [
          '22e7044f-8414-435d-9c4a-2df42a65034b',
        ],
        user: {
          certData: 'userCAD',
          keyData: 'userCKD',
        },
        cluster: {
          caData: 'clusterCAD',
          server: 'https://coucou.com:5000',
          tlsServerName: 'coucou.com',
        },
        clusterResources: true,
        privacy: 'dedicated',
      },
      {
        id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b7',
        label: 'cluster2',
        projectsId: [
          '22e7044f-8414-435d-9c4a-2df42a65034b',
        ],
        user: {
          certData: 'userCAD',
          keyData: 'userCKD',
        },
        clusterResources: true,
        privacy: 'public',
      },
    ]
    // return api.getAllClusters()
  }

  const addCluster = async ({ label, cluster, user, projectsId, clusterResources, privacy }) => {
    return api.addCluster({ label, cluster, user, projectsId, clusterResources, privacy })
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
