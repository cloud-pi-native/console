import { defineStore } from 'pinia'
import type { GenerateCIFilesBody } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useCIFilesStore = defineStore('ciFiles', () => {
  const generateCIFiles = async (ciData: GenerateCIFilesBody) => {
    const response = await api.generateCIFiles(ciData)
    return response ?? {}
  }

  return {
    generateCIFiles,
  }
})
