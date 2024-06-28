import { defineStore } from 'pinia'
import type { GenerateCIFilesBody } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useCIFilesStore = defineStore('ciFiles', () => {
  const generateCIFiles = (ciData: GenerateCIFilesBody) => apiClient.Files.generateCIFiles({ body: ciData })
    .then(response => extractData(response, 201))

  return {
    generateCIFiles,
  }
})
