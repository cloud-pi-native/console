import { defineStore } from 'pinia'
import api from '@/api/index.js'
import type { GenerateCIFilesBody } from '@cpn-console/shared'

export const useCIFilesStore = defineStore('ciFiles', () => {
  const generateCIFiles = async (ciData: GenerateCIFilesBody) => {
    const response = await api.generateCIFiles(ciData)
    return response
  }

  return {
    generateCIFiles,
  }
})
