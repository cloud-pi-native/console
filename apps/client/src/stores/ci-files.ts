import { defineStore } from 'pinia'
import { apiClient } from '@/api/xhr-client.js'

export const useCIFilesStore = defineStore('ciFiles', () => {
  const generateCIFiles = async (ciData: Parameters<typeof apiClient.v1CiFilesCreate>[0]) => (await apiClient.v1CiFilesCreate(ciData)).data

  return {
    generateCIFiles,
  }
})
