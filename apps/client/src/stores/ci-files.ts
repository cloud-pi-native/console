import { defineStore } from 'pinia'
import api from '@/api/index.js'
import type { GenerateCIFilesDto } from '@dso-console/shared'

export const useCIFilesStore = defineStore('ciFiles', () => {
  const generateCIFiles = async (ciData: GenerateCIFilesDto) => {
    const response = await api.generateCIFiles(ciData)
    return response
  }

  return {
    generateCIFiles,
  }
})
